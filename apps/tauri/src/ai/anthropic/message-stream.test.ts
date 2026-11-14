/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import { createMessageStream } from './message-stream';

describe( 'createMessageStream', () => {
	it( 'counts the cached input with the rest of the input', () => {
		const message = createMessageStream( () => {} );
		message.handle( {
			type: 'message_start',
			message: {
				usage: {
					input_tokens: 10,
					cache_creation_input_tokens: 200,
					cache_read_input_tokens: 1000,
					output_tokens: 1,
				},
			},
		} );
		message.handle( {
			type: 'message_delta',
			delta: { stop_reason: 'end_turn' },
			usage: { output_tokens: 42, cache_read_input_tokens: null },
		} );
		message.handle( { type: 'message_stop' } );
		expect( message.finish().usage ).toEqual( {
			inputTokens: 1210,
			cachedInputTokens: 1000,
			outputTokens: 42,
		} );
	} );

	it( 'leaves the usage out when the API did not report it', () => {
		const message = createMessageStream( () => {} );
		message.handle( { type: 'message_stop' } );
		expect( message.finish().usage ).toBeUndefined();
	} );
} );
