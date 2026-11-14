/**
 * External dependencies
 */
import type { AiActivity, AiUsage } from '@mark-bricks/editor';

/**
 * Internal dependencies
 */
import { connectionClosedError, createApiError } from '../error';
import { PROVIDER_NAME } from './errors';
import { EDIT_TOOL_NAME, type ContentBlock } from './request';

const THINKING_TYPES = [ 'thinking', 'redacted_thinking' ];

/**
 * The token counts of a message. The input that was written to or read
 * from the prompt cache is counted apart from the rest.
 */
type Usage = {
	input_tokens?: number | null;
	cache_creation_input_tokens?: number | null;
	cache_read_input_tokens?: number | null;
	output_tokens?: number | null;
};

type StreamEvent = {
	type: string;
	index?: number;
	message?: { usage?: Usage };
	usage?: Usage;
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
	/**
	 * The tokens the message used, or `undefined` when the API did not
	 * report them.
	 */
	usage?: AiUsage;
};

type BlockState = {
	block: { type: string; [ key: string ]: unknown };
	partialJson: string;
};

/**
 * Builds a message from the events of a streamed Messages API response.
 *
 * @param onText     Called with each piece of the answer's text.
 * @param onActivity Called when a thinking block starts, or the edit tool's
 *                   call does.
 * @return `handle` takes each event, and `finish` returns the message.
 */
export function createMessageStream(
	onText: ( text: string ) => void,
	onActivity: ( activity: AiActivity ) => void = () => {}
) {
	const blocks: BlockState[] = [];
	let stopReason: string | null = null;
	let isComplete = false;
	// `message_start` counts the input, and `message_delta` the output so
	// far. Either may update any of the counts.
	let usage: Usage | undefined;

	const handle = ( data: unknown ) => {
		const event = data as StreamEvent;
		switch ( event.type ) {
			case 'message_start':
				if ( event.message?.usage ) {
					usage = {
						...usage,
						...withoutNulls( event.message.usage ),
					};
				}
				return;
			case 'content_block_start': {
				if ( event.index === undefined || ! event.content_block ) {
					return;
				}
				blocks[ event.index ] = {
					block: { ...event.content_block },
					partialJson: '',
				};
				const { type, name, text } = event.content_block;
				if ( THINKING_TYPES.includes( type ) ) {
					onActivity( 'thinking' );
				} else if ( type === 'tool_use' && name === EDIT_TOOL_NAME ) {
					onActivity( 'editing' );
				}
				if ( type === 'text' && typeof text === 'string' && text ) {
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
				if ( event.usage ) {
					usage = { ...usage, ...withoutNulls( event.usage ) };
				}
				return;
			case 'error': {
				// For example `overloaded_error` after the answer started.
				const errorType = event.error?.type ?? '';
				throw createApiError(
					errorType,
					event.error?.message ?? '',
					PROVIDER_NAME
				);
			}
		}
	};

	const finish = (): StreamedMessage => {
		// The response ended before the API finished the message, for
		// example because the connection dropped.
		if ( ! isComplete ) {
			throw connectionClosedError();
		}
		return {
			content: blocks
				.filter( ( state ) => state !== undefined )
				.map( ( state ) => state.block as ContentBlock ),
			stopReason,
			usage: usage && toAiUsage( usage ),
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

/**
 * Keeps the counts the event set, so that a missing count does not erase
 * an earlier one.
 *
 * @param usage The counts of an event.
 */
function withoutNulls( usage: Usage ): Usage {
	return Object.fromEntries(
		Object.entries( usage ).filter(
			( [ , value ] ) => typeof value === 'number'
		)
	);
}

/**
 * Counts the input read from or written to the prompt cache as input too,
 * since the model read it all.
 *
 * @param usage The message's counts.
 */
function toAiUsage( usage: Usage ): AiUsage {
	return {
		inputTokens:
			( usage.input_tokens ?? 0 ) +
			( usage.cache_creation_input_tokens ?? 0 ) +
			( usage.cache_read_input_tokens ?? 0 ),
		outputTokens: usage.output_tokens ?? 0,
	};
}
