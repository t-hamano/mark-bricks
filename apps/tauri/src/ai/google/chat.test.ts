/**
 * External dependencies
 */
import { describe, expect, it, vi } from 'vitest';
import type { AiStreamEvent } from '@mark-bricks/editor';

/**
 * Internal dependencies
 */
import { createChat } from '../chat';
import { google } from '.';
import { createHttpError } from './errors';
import type { RequestBody } from './request';
import answer from './fixtures/answer.sse?raw';
import edit from './fixtures/edit.sse?raw';
import afterEdit from './fixtures/after-edit.sse?raw';
import refusal from './fixtures/refusal.sse?raw';
import blocked from './fixtures/blocked.sse?raw';
import maxTokens from './fixtures/max-tokens.sse?raw';
import malformedCall from './fixtures/malformed-call.sse?raw';
import unavailable from './fixtures/unavailable.sse?raw';
import twoEdits from './fixtures/two-edits.sse?raw';

/**
 * A transport that answers each request with the next stream, in chunks
 * of uneven sizes, and records the requests.
 *
 * @param streams The response body for each request.
 */
function createTransport( streams: string[] ) {
	const bodies: RequestBody[] = [];
	const transport = vi.fn(
		async ( body: object, onChunk: ( chunk: string ) => void ) => {
			bodies.push( structuredClone( body ) as RequestBody );
			const stream = streams.shift();
			if ( stream === undefined ) {
				throw new Error( 'No more streams' );
			}
			for ( let i = 0, size = 1; i < stream.length; i += size ) {
				size = ( size % 7 ) + 3;
				onChunk( stream.slice( i, i + size ) );
			}
		}
	);
	return { transport, bodies };
}

function run(
	streams: string[],
	messages: Parameters<
		ReturnType< typeof createChat >
	>[ 0 ][ 'messages' ] = [ { role: 'user', text: 'Make it shorter' } ]
) {
	const { transport, bodies } = createTransport( streams );
	const events: AiStreamEvent[] = [];
	const chat = createChat( { provider: google, transport } );
	const result = chat( {
		system: 'System prompt',
		messages,
		onEvent: ( event ) => {
			events.push( event );
		},
		signal: new AbortController().signal,
	} );
	return { result, events, bodies };
}

function joinText( events: AiStreamEvent[] ) {
	return events
		.map( ( event ) => ( event.type === 'text' ? event.text : '' ) )
		.join( '' );
}

/**
 * The kinds of the events, in order, with each run of text as one `text`.
 *
 * @param events The events.
 */
function toSteps( events: AiStreamEvent[] ) {
	return events
		.map( ( event ) =>
			event.type === 'activity' ? event.activity : event.type
		)
		.filter( ( step, index, steps ) => step !== steps[ index - 1 ] );
}

describe( 'createChat with Google Gemini', () => {
	it( 'streams the text of an answer, without its thoughts', async () => {
		const { result, events, bodies } = run( [ answer ] );
		await result;
		expect( joinText( events ) ).toBe( '見出しは2つあります。' );
		expect( bodies ).toEqual( [
			{
				model: 'gemini-3.6-flash',
				systemInstruction: { parts: [ { text: 'System prompt' } ] },
				contents: [
					{ role: 'user', parts: [ { text: 'Make it shorter' } ] },
				],
				tools: [
					{
						functionDeclarations: [
							expect.objectContaining( {
								name: 'edit_document',
								parametersJsonSchema: expect.objectContaining( {
									type: 'object',
								} ),
							} ),
						],
					},
				],
				toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
				generationConfig: {
					thinkingConfig: { includeThoughts: true },
				},
			},
		] );
	} );

	it( 'reports when the model thinks and when it edits', async () => {
		const plain = run( [ answer ] );
		await plain.result;
		expect( toSteps( plain.events ) ).toEqual( [
			'thinking',
			'text',
			'usage',
		] );

		const edited = run( [ edit, afterEdit ] );
		await edited.result;
		expect( toSteps( edited.events ) ).toEqual( [
			'text',
			'editing',
			'usage',
			'edit',
			'text',
			'usage',
		] );
	} );

	it( 'reports the tokens of each request, with the thoughts as output', async () => {
		const plain = run( [ answer ] );
		await plain.result;
		expect(
			plain.events.filter( ( event ) => event.type === 'usage' )
		).toEqual( [
			{
				type: 'usage',
				usage: {
					inputTokens: 220,
					cachedInputTokens: 0,
					outputTokens: 49,
				},
			},
		] );

		const edited = run( [ edit, afterEdit ] );
		await edited.result;
		expect(
			edited.events.filter( ( event ) => event.type === 'usage' )
		).toEqual( [
			{
				type: 'usage',
				usage: {
					inputTokens: 130,
					cachedInputTokens: 0,
					outputTokens: 48,
				},
			},
			{
				type: 'usage',
				usage: {
					inputTokens: 190,
					cachedInputTokens: 128,
					outputTokens: 12,
				},
			},
		] );
	} );

	it( 'reports an edit, then continues the answer after it', async () => {
		const { result, events, bodies } = run( [ edit, afterEdit ] );
		await result;

		expect( events.filter( ( event ) => event.type === 'edit' ) ).toEqual( [
			{
				type: 'edit',
				edit: { action: 'replace', markdown: 'A short\nparagraph.' },
			},
		] );
		expect( joinText( events ) ).toBe(
			'Shortening the paragraph.\n\nI cut it to one sentence.'
		);

		expect( bodies ).toHaveLength( 2 );
		const [ first, second ] = bodies;
		expect( second.systemInstruction ).toEqual( first.systemInstruction );
		expect( second.tools ).toEqual( first.tools );
		expect( second.toolConfig ).toEqual( {
			functionCallingConfig: { mode: 'NONE' },
		} );
		expect( second.contents ).toEqual( [
			{ role: 'user', parts: [ { text: 'Make it shorter' } ] },
			{
				role: 'model',
				parts: [
					{ text: 'Shortening the paragraph.' },
					{
						functionCall: {
							id: 'call_01',
							name: 'edit_document',
							args: {
								action: 'replace',
								markdown: 'A short\nparagraph.',
							},
						},
						thoughtSignature: 'sig_edit',
					},
				],
			},
			{
				role: 'user',
				parts: [
					{
						functionResponse: {
							id: 'call_01',
							name: 'edit_document',
							response: { result: 'The edit was applied.' },
						},
					},
				],
			},
		] );
	} );

	it( 'applies only the first of several edits', async () => {
		const { result, events, bodies } = run( [ twoEdits, afterEdit ] );
		await result;
		expect( events.filter( ( event ) => event.type === 'edit' ) ).toEqual( [
			{ type: 'edit', edit: { action: 'replace', markdown: 'First' } },
		] );
		expect( bodies[ 1 ].contents.slice( 1 ) ).toEqual( [
			{
				role: 'model',
				parts: [
					{
						functionCall: {
							id: 'call_01',
							name: 'edit_document',
							args: { action: 'replace', markdown: 'First' },
						},
						thoughtSignature: 'sig_edit',
					},
				],
			},
			{
				role: 'user',
				parts: [
					{
						functionResponse: {
							id: 'call_01',
							name: 'edit_document',
							response: { result: 'The edit was applied.' },
						},
					},
				],
			},
		] );
	} );

	it( 'sends earlier edits back as function calls', async () => {
		const { result, bodies } = run(
			[ answer ],
			[
				{ role: 'user', text: 'Make it shorter' },
				{
					role: 'assistant',
					text: 'Done.',
					edit: { action: 'insert_after', markdown: 'More' },
				},
				{ role: 'user', text: 'Thanks' },
				{
					role: 'assistant',
					text: '',
					edit: { action: 'replace', markdown: 'Less' },
				},
				{ role: 'user', text: 'Again' },
			]
		);
		await result;
		const response = {
			functionResponse: {
				name: 'edit_document',
				response: { result: 'The edit was applied.' },
			},
		};
		expect( bodies[ 0 ].contents ).toEqual( [
			{ role: 'user', parts: [ { text: 'Make it shorter' } ] },
			{
				role: 'model',
				parts: [
					{
						functionCall: {
							name: 'edit_document',
							args: {
								action: 'insert_after',
								find: '',
								markdown: 'More',
							},
						},
					},
				],
			},
			{ role: 'user', parts: [ response ] },
			{ role: 'model', parts: [ { text: 'Done.' } ] },
			{ role: 'user', parts: [ { text: 'Thanks' } ] },
			{
				role: 'model',
				parts: [
					{
						functionCall: {
							name: 'edit_document',
							args: {
								action: 'replace',
								find: '',
								markdown: 'Less',
							},
						},
					},
				],
			},
			// Messages of the same role join, since an edit without text
			// leaves two user messages in a row.
			{ role: 'user', parts: [ response, { text: 'Again' } ] },
		] );
	} );

	it( 'rejects when the model declines', async () => {
		await expect( run( [ refusal ] ).result ).rejects.toMatchObject( {
			errorType: 'refusal',
		} );
		await expect( run( [ blocked ] ).result ).rejects.toMatchObject( {
			errorType: 'refusal',
		} );
	} );

	it( 'rejects when the answer reaches the length limit', async () => {
		await expect( run( [ maxTokens ] ).result ).rejects.toThrow(
			'The answer was cut off because it reached the length limit.'
		);
	} );

	it( 'rejects when the edit could not be read', async () => {
		await expect( run( [ malformedCall ] ).result ).rejects.toThrow(
			'The edit from the model could not be read.'
		);
	} );

	it( 'rejects when the stream reports an error', async () => {
		await expect( run( [ unavailable ] ).result ).rejects.toMatchObject( {
			errorType: 'overloaded_error',
			message:
				'The Google Gemini API is not available right now. Try again later.',
		} );
	} );

	it( 'rejects when the stream ends before the answer', async () => {
		const cut = answer.slice( 0, answer.lastIndexOf( 'data:' ) );
		await expect( run( [ cut ] ).result ).rejects.toThrow(
			'The connection closed before the answer was complete.'
		);
	} );
} );

describe( 'createHttpError', () => {
	it.each( [
		[ 400, 'INVALID_ARGUMENT', 'API_KEY_INVALID', 'authentication_error' ],
		[ 403, 'PERMISSION_DENIED', null, 'permission_error' ],
		[ 404, 'NOT_FOUND', null, 'not_found_error' ],
		[ 429, 'RESOURCE_EXHAUSTED', null, 'rate_limit_error' ],
		[ 500, 'INTERNAL', null, 'api_error' ],
		[ 503, 'UNAVAILABLE', null, 'overloaded_error' ],
	] )(
		'names the failure of status %i',
		( status, apiStatus, reason, errorType ) => {
			const body = JSON.stringify( {
				error: {
					code: status,
					message: 'Failed',
					status: apiStatus,
					details: reason
						? [
								{
									'@type':
										'type.googleapis.com/google.rpc.ErrorInfo',
									reason,
								},
							]
						: [],
				},
			} );
			expect( createHttpError( status, body ).errorType ).toBe(
				errorType
			);
		}
	);

	it( 'reads an error wrapped in a list', () => {
		expect(
			createHttpError(
				429,
				'[{"error":{"code":429,"message":"Quota","status":"RESOURCE_EXHAUSTED"}}]'
			).errorType
		).toBe( 'rate_limit_error' );
	} );

	it( 'passes on the message of an unknown failure', () => {
		expect(
			createHttpError(
				400,
				'{"error":{"code":400,"message":"User location is not supported for the API use.","status":"FAILED_PRECONDITION"}}'
			).message
		).toBe(
			'The request failed: User location is not supported for the API use.'
		);
	} );
} );
