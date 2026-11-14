/**
 * External dependencies
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invoke } = vi.hoisted( () => ( { invoke: vi.fn() } ) );

vi.mock( '@tauri-apps/api/core', () => ( {
	invoke,
	Channel: class {
		onmessage: ( message: unknown ) => void = () => {};
	},
} ) );

/**
 * Internal dependencies
 */
import { createTauriTransport, toTransportError } from './transport';
import type { RequestBody } from './anthropic/request';

const body = { model: 'claude-opus-5-5' } as RequestBody;

type Channel = { onmessage: ( message: unknown ) => void };

/**
 * Makes `ai_request` send the events, then return with `result`.
 *
 * @param events The events to send through the channel.
 * @param result What the command returns, or rejects with.
 */
function answerWith( events: unknown[], result: Promise< void > ) {
	invoke.mockImplementation(
		async ( command: string, args: { onEvent: Channel } ) => {
			if ( command !== 'ai_request' ) {
				return;
			}
			events.forEach( ( event ) => args.onEvent.onmessage( event ) );
			return result;
		}
	);
}

beforeEach( () => {
	invoke.mockReset();
} );

describe( 'createTauriTransport', () => {
	it( 'sends the body and passes on the chunks', async () => {
		answerWith(
			[
				{ event: 'chunk', data: 'event: ' },
				{ event: 'chunk', data: 'ping\n\n' },
				{ event: 'end' },
			],
			Promise.resolve()
		);
		const chunks: string[] = [];
		await createTauriTransport( 'anthropic' )(
			body,
			( chunk ) => chunks.push( chunk ),
			new AbortController().signal
		);
		expect( chunks ).toEqual( [ 'event: ', 'ping\n\n' ] );
		expect( invoke ).toHaveBeenCalledWith( 'ai_request', {
			id: expect.any( String ),
			provider: 'anthropic',
			body: JSON.stringify( body ),
			onEvent: expect.anything(),
		} );
	} );

	it( 'sends the request to the provider it was created for', async () => {
		answerWith( [ { event: 'end' } ], Promise.resolve() );
		await createTauriTransport( 'openai' )(
			body,
			() => {},
			new AbortController().signal
		);
		expect( invoke ).toHaveBeenCalledWith(
			'ai_request',
			expect.objectContaining( { provider: 'openai' } )
		);
	} );

	it( 'waits for the end event when the command returns first', async () => {
		let channel: Channel | undefined;
		invoke.mockImplementation(
			async ( _command: string, args: { onEvent: Channel } ) => {
				channel = args.onEvent;
			}
		);
		let done = false;
		const request = createTauriTransport( 'anthropic' )(
			body,
			() => {},
			new AbortController().signal
		).then( () => ( done = true ) );
		await new Promise( ( resolve ) => setTimeout( resolve ) );
		expect( done ).toBe( false );
		channel!.onmessage( { event: 'end' } );
		await request;
		expect( done ).toBe( true );
	} );

	it( 'rejects with the API error of a failed response', async () => {
		answerWith(
			[],
			Promise.reject( {
				code: 'http',
				status: 429,
				body: '{"type":"error","error":{"type":"rate_limit_error","message":"Slow down"}}',
			} )
		);
		await expect(
			createTauriTransport( 'anthropic' )(
				body,
				() => {},
				new AbortController().signal
			)
		).rejects.toMatchObject( { errorType: 'rate_limit_error' } );
	} );

	it( 'cancels the request when the signal is aborted', async () => {
		invoke.mockImplementation( () => new Promise( () => {} ) );
		const controller = new AbortController();
		const request = createTauriTransport( 'anthropic' )(
			body,
			() => {},
			controller.signal
		);
		controller.abort();
		await expect( request ).rejects.toMatchObject( {
			name: 'AbortError',
		} );
		const id = invoke.mock.calls[ 0 ][ 1 ].id;
		expect( invoke ).toHaveBeenCalledWith( 'cancel_ai_request', { id } );
	} );

	it( 'does not send a request when the signal is already aborted', async () => {
		const controller = new AbortController();
		controller.abort();
		await expect(
			createTauriTransport( 'anthropic' )(
				body,
				() => {},
				controller.signal
			)
		).rejects.toMatchObject( { name: 'AbortError' } );
		expect( invoke ).not.toHaveBeenCalled();
	} );

	it( 'stops the request when a chunk cannot be handled', async () => {
		answerWith(
			[ { event: 'chunk', data: 'bad' } ],
			new Promise( () => {} )
		);
		await expect(
			createTauriTransport( 'anthropic' )(
				body,
				() => {
					throw new Error( 'Bad stream' );
				},
				new AbortController().signal
			)
		).rejects.toThrow( 'Bad stream' );
		expect( invoke ).toHaveBeenCalledWith( 'cancel_ai_request', {
			id: expect.any( String ),
		} );
	} );
} );

describe( 'toTransportError', () => {
	it( 'describes a missing API key', () => {
		expect(
			toTransportError( { code: 'no_api_key' }, 'anthropic' ).message
		).toBe( 'No API key is saved. Add one in the settings.' );
	} );

	it( 'describes a network failure', () => {
		expect(
			toTransportError(
				{ code: 'network', message: 'dns error' },
				'anthropic'
			).message
		).toBe( 'Could not connect to the Anthropic API.' );
		expect(
			toTransportError(
				{ code: 'network', message: 'dns error' },
				'openai'
			).message
		).toBe( 'Could not connect to the OpenAI API.' );
	} );

	it( 'describes a failed OpenAI request', () => {
		expect(
			toTransportError(
				{
					code: 'http',
					status: 401,
					body: '{"error":{"message":"Incorrect API key provided","type":"invalid_request_error","param":null,"code":"invalid_api_key"}}',
				},
				'openai'
			)
		).toMatchObject( {
			errorType: 'authentication_error',
			message: 'The API key is not valid. Check it in the settings.',
		} );
	} );

	it( 'turns a cancelled request into an AbortError', () => {
		expect(
			toTransportError( { code: 'cancelled' }, 'anthropic' ).name
		).toBe( 'AbortError' );
	} );
} );
