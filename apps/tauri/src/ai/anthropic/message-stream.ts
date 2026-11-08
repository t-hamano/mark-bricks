/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { AnthropicError, describeApiError } from './errors';
import type { ContentBlock } from './request';

type StreamEvent = {
	type: string;
	index?: number;
	content_block?: { type: string; [ key: string ]: unknown };
	delta?: {
		type?: string;
		text?: string;
		thinking?: string;
		signature?: string;
		partial_json?: string;
		stop_reason?: string | null;
	};
	error?: { type?: string; message?: string };
};

export type StreamedMessage = {
	/**
	 * The message's content blocks, as the API sent them. Tool inputs are
	 * parsed, or `undefined` when their JSON is incomplete.
	 */
	content: ContentBlock[];
	stopReason: string | null;
};

type BlockState = {
	block: { type: string; [ key: string ]: unknown };
	partialJson: string;
};

/**
 * Builds a message from the events of a streamed Messages API response.
 *
 * @param onText Called with each piece of the answer's text.
 * @return `handle` takes each event, and `finish` returns the message.
 */
export function createMessageStream( onText: ( text: string ) => void ) {
	const blocks: BlockState[] = [];
	let stopReason: string | null = null;
	let isComplete = false;

	const handle = ( data: unknown ) => {
		const event = data as StreamEvent;
		switch ( event.type ) {
			case 'content_block_start': {
				if ( event.index === undefined || ! event.content_block ) {
					return;
				}
				blocks[ event.index ] = {
					block: { ...event.content_block },
					partialJson: '',
				};
				const text = event.content_block.text;
				if (
					event.content_block.type === 'text' &&
					typeof text === 'string' &&
					text
				) {
					onText( text );
				}
				return;
			}
			case 'content_block_delta': {
				const state =
					event.index === undefined
						? undefined
						: blocks[ event.index ];
				const delta = event.delta;
				if ( ! state || ! delta ) {
					return;
				}
				if ( delta.type === 'text_delta' && delta.text ) {
					state.block.text =
						( ( state.block.text as string ) ?? '' ) + delta.text;
					onText( delta.text );
				} else if (
					delta.type === 'thinking_delta' &&
					delta.thinking
				) {
					state.block.thinking =
						( ( state.block.thinking as string ) ?? '' ) +
						delta.thinking;
				} else if ( delta.type === 'signature_delta' ) {
					state.block.signature = delta.signature;
				} else if ( delta.type === 'input_json_delta' ) {
					state.partialJson += delta.partial_json ?? '';
				}
				return;
			}
			case 'content_block_stop': {
				const state =
					event.index === undefined
						? undefined
						: blocks[ event.index ];
				if ( state?.block.type === 'tool_use' ) {
					state.block.input = parseToolInput( state.partialJson );
				}
				return;
			}
			case 'message_stop':
				isComplete = true;
				return;
			case 'message_delta':
				if ( event.delta && 'stop_reason' in event.delta ) {
					stopReason = event.delta.stop_reason ?? null;
				}
				return;
			case 'error': {
				// For example `overloaded_error` after the answer started.
				const errorType = event.error?.type ?? '';
				throw new AnthropicError(
					describeApiError( errorType, event.error?.message ?? '' ),
					errorType || null
				);
			}
		}
	};

	const finish = (): StreamedMessage => {
		// The response ended before the API finished the message, for
		// example because the connection dropped.
		if ( ! isComplete ) {
			throw new AnthropicError(
				__(
					'The connection closed before the answer was complete.',
					'mark-bricks'
				)
			);
		}
		return {
			content: blocks
				.filter( ( state ) => state !== undefined )
				.map( ( state ) => state.block as ContentBlock ),
			stopReason,
		};
	};

	return { handle, finish };
}

/**
 * Parses the JSON a tool's input streamed as. An empty input is `{}`.
 *
 * @param json The tool input's JSON.
 * @return The input, or `undefined` when the JSON is incomplete.
 */
function parseToolInput( json: string ): unknown {
	if ( ! json ) {
		return {};
	}
	try {
		return JSON.parse( json );
	} catch {
		return undefined;
	}
}
