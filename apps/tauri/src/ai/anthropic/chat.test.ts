/**
 * External dependencies
 */
import { describe, expect, it, vi } from 'vitest';
import type { AiStreamEvent } from '@mark-bricks/editor';

/**
 * Internal dependencies
 */
import { createChat } from '../chat';
import { toEchoContent } from './answer';
import { anthropic } from '.';
import { createHttpError } from './errors';
import type { RequestBody } from './request';
import answer from './fixtures/answer.sse?raw';
import edit from './fixtures/edit.sse?raw';
import afterEdit from './fixtures/after-edit.sse?raw';
import refusal from './fixtures/refusal.sse?raw';
import overloaded from './fixtures/overloaded.sse?raw';

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

async function run( streams: string[], signal = new AbortController().signal ) {
	const { transport, bodies } = createTransport( streams );
	const events: AiStreamEvent[] = [];
	const chat = createChat( { provider: anthropic, transport } );
	const result = chat( {
		system: 'System prompt',
		messages: [ { role: 'user', text: 'Make it shorter' } ],
		onEvent: ( event ) => events.push( event ),
		signal,
	} );
	return { result, events, bodies, transport };
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

describe( 'createChat with Anthropic', () => {
	it( 'streams the text of an answer', async () => {
		const { result, events, bodies } = await run( [ answer ] );
		await result;
		expect( joinText( events ) ).toBe( '見出しは2つあります。' );
		expect( events.some( ( event ) => event.type === 'edit' ) ).toBe(
			false
		);
		expect( bodies ).toHaveLength( 1 );
		expect( bodies[ 0 ] ).toMatchObject( {
			system: 'System prompt',
			messages: [
				{
					role: 'user',
					content: [ { type: 'text', text: 'Make it shorter' } ],
				},
			],
		} );
	} );

	it( 'reports when the model thinks and when it edits', async () => {
		const plain = await run( [ answer ] );
		await plain.result;
		expect( toSteps( plain.events ) ).toEqual( [
			'thinking',
			'text',
			'usage',
		] );

		const edited = await run( [ edit, afterEdit ] );
		await edited.result;
		expect( toSteps( edited.events ) ).toEqual( [
			'thinking',
			'text',
			'editing',
			'usage',
			'edit',
			'text',
			'usage',
		] );
	} );

	it( 'reports the tokens of each request', async () => {
		const { result, events } = await run( [ edit, afterEdit ] );
		await result;
		expect( events.filter( ( event ) => event.type === 'usage' ) ).toEqual(
			[
				{
					type: 'usage',
					usage: { inputTokens: 150, outputTokens: 60 },
				},
				{ type: 'usage', usage: { inputTokens: 220, outputTokens: 9 } },
			]
		);
	} );

	it( 'reports an edit, then continues the answer after it', async () => {
		const { result, events, bodies } = await run( [ edit, afterEdit ] );
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
		expect( second.system ).toBe( first.system );
		expect( second.tools ).toEqual( first.tools );
		expect( second.tool_choice ).toEqual( { type: 'none' } );
		expect( second.messages.slice( 1 ) ).toEqual( [
			{
				role: 'assistant',
				content: [
					{ type: 'thinking', thinking: '', signature: 'sig_edit' },
					{ type: 'text', text: 'Shortening the paragraph.' },
					{
						type: 'tool_use',
						id: 'toolu_01',
						name: 'edit_selection',
						input: {
							action: 'replace',
							markdown: 'A short\nparagraph.',
						},
					},
				],
			},
			{
				role: 'user',
				content: [
					{
						type: 'tool_result',
						tool_use_id: 'toolu_01',
						content: 'The edit was applied.',
					},
				],
			},
		] );
	} );

	it( 'does not continue when the answer is stopped after the edit', async () => {
		const controller = new AbortController();
		const { transport } = createTransport( [ edit, afterEdit ] );
		const chat = createChat( { provider: anthropic, transport } );
		const result = chat( {
			system: 'System prompt',
			messages: [ { role: 'user', text: 'Make it shorter' } ],
			onEvent: ( event ) => {
				if ( event.type === 'edit' ) {
					controller.abort();
				}
			},
			signal: controller.signal,
		} );
		await expect( result ).rejects.toMatchObject( { name: 'AbortError' } );
		expect( transport ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'rejects a response that ends before the message is complete', async () => {
		const truncated = edit.slice(
			0,
			edit.indexOf(
				'event: content_block_start\ndata: {"type":"content_block_start","index":2'
			)
		);
		const { result, events } = await run( [ truncated ] );
		await expect( result ).rejects.toThrow(
			'The connection closed before the answer was complete.'
		);
		expect( events.some( ( event ) => event.type === 'edit' ) ).toBe(
			false
		);
	} );

	it( 'rejects when the model declines', async () => {
		const { result } = await run( [ refusal ] );
		await expect( result ).rejects.toThrow(
			'The model declined to answer this request.'
		);
	} );

	it( 'rejects on an error event in the stream', async () => {
		const { result, events } = await run( [ overloaded ] );
		await expect( result ).rejects.toMatchObject( {
			errorType: 'overloaded_error',
		} );
		expect( joinText( events ) ).toBe( 'Here' );
	} );

	it( 'passes on the error of a failed response', async () => {
		const transport = vi.fn( async () => {
			throw createHttpError(
				401,
				'{"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}'
			);
		} );
		const chat = createChat( { provider: anthropic, transport } );
		await expect(
			chat( {
				system: '',
				messages: [ { role: 'user', text: 'Hi' } ],
				onEvent: () => {},
				signal: new AbortController().signal,
			} )
		).rejects.toThrow(
			'The API key is not valid. Check it in the settings.'
		);
	} );
} );

describe( 'toEchoContent', () => {
	it( 'leaves out empty text blocks', () => {
		expect(
			toEchoContent( [
				{ type: 'text', text: '' },
				{ type: 'text', text: 'Hi' },
			] )
		).toEqual( [ { type: 'text', text: 'Hi' } ] );
	} );

	it( 'leaves out the blocks of a model that declined mid-answer', () => {
		expect(
			toEchoContent( [
				{ type: 'thinking', thinking: '', signature: 'a' },
				{ type: 'text', text: 'Partial' },
				{
					type: 'tool_use',
					id: 'toolu_a',
					name: 'edit_selection',
					input: {},
				},
				{ type: 'fallback', from: {}, to: {} },
				{ type: 'thinking', thinking: '', signature: 'b' },
				{ type: 'text', text: 'Rest' },
			] )
		).toEqual( [
			{ type: 'text', text: 'Partial' },
			{ type: 'thinking', thinking: '', signature: 'b' },
			{ type: 'text', text: 'Rest' },
		] );
	} );
} );

describe( 'createHttpError', () => {
	it( 'describes an error by its type', () => {
		expect(
			createHttpError(
				429,
				'{"type":"error","error":{"type":"rate_limit_error","message":"Slow down"}}'
			).message
		).toBe( 'Too many requests. Wait a moment and try again.' );
	} );

	it( 'falls back to the status when the body is not JSON', () => {
		const error = createHttpError( 529, '<html></html>' );
		expect( error.errorType ).toBe( 'overloaded_error' );
	} );

	it( 'shows the message of other errors', () => {
		expect(
			createHttpError(
				400,
				'{"type":"error","error":{"type":"invalid_request_error","message":"messages: bad"}}'
			).message
		).toBe( 'The request failed: messages: bad' );
	} );
} );
