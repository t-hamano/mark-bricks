/**
 * External dependencies
 */
import { Channel, invoke } from '@tauri-apps/api/core';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import {
	AnthropicError,
	createHttpError,
	type AnthropicTransport,
} from './anthropic';

type StreamEvent = { event: 'chunk'; data: string } | { event: 'end' };

type RequestError =
	| { code: 'no_api_key' }
	| { code: 'http'; status: number; body: string }
	| { code: 'network'; message: string }
	| { code: 'cancelled' }
	| { code: 'other'; message: string };

function abortError() {
	return new DOMException( 'The answer was stopped.', 'AbortError' );
}

/**
 * Converts the error of the `ai_request` command to the error the chat
 * shows.
 *
 * @param error What the command rejected with.
 */
export function toTransportError( error: unknown ): Error {
	const { code } = ( error ?? {} ) as Partial< RequestError >;
	switch ( code ) {
		case 'no_api_key':
			return new AnthropicError(
				__(
					'No API key is saved. Add one in the settings.',
					'mark-bricks'
				)
			);
		case 'http': {
			const { status, body } = error as { status: number; body: string };
			return createHttpError( status, body );
		}
		case 'network':
			return new AnthropicError(
				__( 'Could not connect to the Anthropic API.', 'mark-bricks' )
			);
		case 'cancelled':
			return abortError();
		case 'other':
			return new AnthropicError(
				( error as { message: string } ).message
			);
	}
	return new AnthropicError( String( error ) );
}

/**
 * Sends the requests through the native side, which adds the API key.
 */
export function createTauriTransport(): AnthropicTransport {
	return ( body, onChunk, signal ) =>
		new Promise< void >( ( resolve, reject ) => {
			if ( signal.aborted ) {
				reject( abortError() );
				return;
			}

			const id = crypto.randomUUID();
			let settled = false;
			let ended = false;
			let returned = false;
			const settle = ( error?: Error ) => {
				if ( settled ) {
					return;
				}
				settled = true;
				signal.removeEventListener( 'abort', onAbort );
				if ( error ) {
					reject( error );
				} else {
					resolve();
				}
			};
			// The command can return before the last chunks arrive, so the
			// request ends when both happened.
			const settleIfDone = () => {
				if ( ended && returned ) {
					settle();
				}
			};
			const onAbort = () => {
				invoke( 'cancel_ai_request', { id } ).catch( () => {} );
				settle( abortError() );
			};
			signal.addEventListener( 'abort', onAbort );

			const channel = new Channel< StreamEvent >();
			channel.onmessage = ( message ) => {
				if ( settled ) {
					return;
				}
				if ( message.event === 'chunk' ) {
					try {
						onChunk( message.data );
					} catch ( error ) {
						// The stream reported an error, so the rest is not
						// needed.
						invoke( 'cancel_ai_request', { id } ).catch( () => {} );
						settle( error as Error );
					}
				} else {
					ended = true;
					settleIfDone();
				}
			};

			invoke( 'ai_request', {
				id,
				provider: 'anthropic',
				body: JSON.stringify( body ),
				onEvent: channel,
			} ).then(
				() => {
					returned = true;
					settleIfDone();
				},
				( error ) => settle( toTransportError( error ) )
			);
		} );
}
