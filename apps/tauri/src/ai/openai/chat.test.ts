/**
 * External dependencies
 */
import { describe, expect, it, vi } from 'vitest';
import type { AiStreamEvent } from '@mark-bricks/editor';

/**
 * Internal dependencies
 */
import { createOpenAiChat } from './chat';
import { createHttpError } from './errors';
import type { RequestBody } from './request';
import answer from './fixtures/answer.sse?raw';
import edit from './fixtures/edit.sse?raw';
import afterEdit from './fixtures/after-edit.sse?raw';
import refusal from './fixtures/refusal.sse?raw';
import incomplete from './fixtures/incomplete.sse?raw';
import failed from './fixtures/failed.sse?raw';

/**
 * A transport that answers each request with the next stream, in chunks
 * of uneven sizes, and records the requests.
 *
 * @param streams The response body for each request.
 */
function createTransport( streams: string[] ) {
	const bodies: RequestBody[] = [];
	const transport = vi.fn(
		async ( body: RequestBody, onChunk: ( chunk: string ) => void ) => {
			bodies.push( structuredClone( body ) );
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
		ReturnType< typeof createOpenAiChat >
	>[ 0 ][ 'messages' ] = [ { role: 'user', text: 'Make it shorter' } ]
) {
	const { transport, bodies } = createTransport( streams );
	const events: AiStreamEvent[] = [];
	const chat = createOpenAiChat( { transport } );
	const result = chat( {
		system: 'System prompt',
		messages,
		onEvent: ( event ) => events.push( event ),
		signal: new AbortController().signal,
	} );
	return { result, events, bodies };
}

function joinText( events: AiStreamEvent[] ) {
	return events
		.map( ( event ) => ( event.type === 'text' ? event.text : '' ) )
		.join( '' );
}

describe( 'createOpenAiChat', () => {
	it( 'streams the text of an answer', async () => {
		const { result, events, bodies } = run( [ answer ] );
		await result;
		expect( joinText( events ) ).toBe( '見出しは2つあります。' );
		expect( bodies ).toEqual( [
			{
				model: 'gpt-6-astra',
				instructions: 'System prompt',
				input: [ { role: 'user', content: 'Make it shorter' } ],
				tools: [
					expect.objectContaining( {
						type: 'function',
						name: 'edit_selection',
						strict: true,
					} ),
				],
				tool_choice: 'auto',
				parallel_tool_calls: false,
				stream: true,
				store: false,
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
		expect( second.instructions ).toBe( first.instructions );
		expect( second.tools ).toEqual( first.tools );
		expect( second.tool_choice ).toBe( 'none' );
		expect( second.input ).toEqual( [
			{ role: 'user', content: 'Make it shorter' },
			{ role: 'assistant', content: 'Shortening the paragraph.' },
			{
				type: 'function_call',
				call_id: 'call_01',
				name: 'edit_selection',
				arguments:
					'{"action":"replace","markdown":"A short\\nparagraph."}',
			},
			{
				type: 'function_call_output',
				call_id: 'call_01',
				output: 'The edit was applied.',
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
			]
		);
		await result;
		expect( bodies[ 0 ].input ).toEqual( [
			{ role: 'user', content: 'Make it shorter' },
			{
				type: 'function_call',
				call_id: 'call_history_1',
				name: 'edit_selection',
				arguments: '{"action":"insert_after","markdown":"More"}',
			},
			{
				type: 'function_call_output',
				call_id: 'call_history_1',
				output: 'The edit was applied.',
			},
			{ role: 'assistant', content: 'Done.' },
			{ role: 'user', content: 'Thanks' },
		] );
	} );

	it( 'rejects when the model declines', async () => {
		await expect( run( [ refusal ] ).result ).rejects.toMatchObject( {
			errorType: 'refusal',
		} );
	} );

	it( 'rejects when the answer reaches the length limit', async () => {
		await expect( run( [ incomplete ] ).result ).rejects.toThrow(
			'The answer was cut off because it reached the length limit.'
		);
	} );

	it( 'rejects when the response fails in the stream', async () => {
		await expect( run( [ failed ] ).result ).rejects.toMatchObject( {
			errorType: 'api_error',
			message:
				'The OpenAI API is not available right now. Try again later.',
		} );
	} );

	it( 'rejects when the stream ends before the response', async () => {
		const cut = answer.slice(
			0,
			answer.indexOf( 'event: response.completed' )
		);
		await expect( run( [ cut ] ).result ).rejects.toThrow(
			'The connection closed before the answer was complete.'
		);
	} );
} );

describe( 'createHttpError', () => {
	it.each( [
		[ 401, 'invalid_api_key', 'authentication_error' ],
		[ 404, 'model_not_found', 'not_found_error' ],
		[ 429, 'insufficient_quota', 'insufficient_quota' ],
		[ 429, 'rate_limit_exceeded', 'rate_limit_error' ],
		[ 503, null, 'api_error' ],
	] )( 'names the failure of status %i', ( status, code, errorType ) => {
		const body = JSON.stringify( {
			error: { message: 'Failed', type: 'error', param: null, code },
		} );
		expect( createHttpError( status, body ).errorType ).toBe( errorType );
	} );

	it( 'passes on the message of an unknown failure', () => {
		expect(
			createHttpError(
				400,
				'{"error":{"message":"Invalid input","type":"invalid_request_error","code":null}}'
			).message
		).toBe( 'The request failed: Invalid input' );
	} );
} );
