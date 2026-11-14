/**
 * External dependencies
 */
import type { AiActivity, AiUsage } from '@mark-bricks/editor/ai';
import { EDIT_RESULT } from '@mark-bricks/editor/ai';

/**
 * Internal dependencies
 */
import {
	connectionClosedError,
	lengthLimitError,
	refusalError,
} from '../error';
import type { ProviderAnswer } from '../provider';
import { createStreamError } from './errors';
import {
	EDIT_TOOL_NAME,
	type FunctionCallOutputItem,
	type OutputItem,
} from './request';

type ApiError = { code?: string | null; message?: string | null };

type StreamEvent = {
	type: string;
	delta?: string;
	item?: OutputItem & {
		call_id?: string;
		name?: string;
		arguments?: string;
		content?: { type: string }[];
	};
	response?: {
		incomplete_details?: { reason?: string } | null;
		error?: ApiError | null;
		/**
		 * The input counts the cached tokens too, and the output the
		 * reasoning tokens.
		 */
		usage?: {
			input_tokens?: number;
			input_tokens_details?: { cached_tokens?: number } | null;
			output_tokens?: number;
		} | null;
	};
	code?: string | null;
	message?: string | null;
	error?: ApiError;
};

/**
 * The output items that are sent back to continue the answer.
 */
const REPLAYED_TYPES = [ 'reasoning', 'message', 'function_call' ];

/**
 * Reads a streamed Responses API answer. See
 * `AiProviderAdapter.readAnswer`.
 *
 * @param onText     Called with each piece of the answer's text.
 * @param onActivity Called when the model starts to reason, or to write
 *                   the edit tool's call.
 */
export function readAnswer(
	onText: ( text: string ) => void,
	onActivity: ( activity: AiActivity ) => void = () => {}
) {
	// The answer's items, as the API sent them, including the reasoning
	// that led to the edit.
	const outputItems: OutputItem[] = [];
	let editCall: { callId: string; arguments: string } | undefined;
	let refused = false;
	let incompleteReason: string | null = null;
	let isComplete = false;
	let usage: AiUsage | undefined;

	const handle = ( data: unknown ) => {
		const event = data as StreamEvent;
		switch ( event.type ) {
			case 'response.output_text.delta':
				if ( event.delta ) {
					onText( event.delta );
				}
				return;
			case 'response.output_item.added':
				if ( event.item?.type === 'reasoning' ) {
					onActivity( 'thinking' );
				} else if (
					event.item?.type === 'function_call' &&
					event.item.name === EDIT_TOOL_NAME
				) {
					onActivity( 'editing' );
				}
				return;
			case 'response.refusal.delta':
				refused = true;
				return;
			case 'response.output_item.done': {
				const item = event.item;
				if ( ! item || ! REPLAYED_TYPES.includes( item.type ) ) {
					return;
				}
				outputItems.push( item );
				if (
					item.type === 'function_call' &&
					item.name === EDIT_TOOL_NAME &&
					item.call_id &&
					! editCall
				) {
					editCall = {
						callId: item.call_id,
						arguments: item.arguments ?? '',
					};
				} else if (
					item.content?.some( ( part ) => part.type === 'refusal' )
				) {
					refused = true;
				}
				return;
			}
			case 'response.completed': {
				isComplete = true;
				const counts = event.response?.usage;
				if ( counts ) {
					usage = {
						inputTokens: counts.input_tokens ?? 0,
						cachedInputTokens:
							counts.input_tokens_details?.cached_tokens ?? 0,
						outputTokens: counts.output_tokens ?? 0,
					};
				}
				return;
			}
			case 'response.incomplete':
				isComplete = true;
				incompleteReason =
					event.response?.incomplete_details?.reason ?? 'unknown';
				return;
			case 'response.failed':
				throw createStreamError( event.response?.error ?? undefined );
			case 'error':
				throw createStreamError(
					event.error ?? { code: event.code, message: event.message }
				);
		}
	};

	const finish = (): ProviderAnswer => {
		if ( ! isComplete ) {
			throw connectionClosedError();
		}
		if ( refused || incompleteReason === 'content_filter' ) {
			throw refusalError();
		}
		if ( incompleteReason === 'max_output_tokens' ) {
			throw lengthLimitError();
		}
		if ( ! editCall ) {
			return { continuation: () => [], usage };
		}
		const { callId } = editCall;
		return {
			editCall: { input: parseArguments( editCall.arguments ) },
			continuation: ( error ) => {
				const output: FunctionCallOutputItem = {
					type: 'function_call_output',
					call_id: callId,
					output: error ?? EDIT_RESULT,
				};
				return [ ...outputItems, output ];
			},
			usage,
		};
	};

	return { handle, finish };
}

/**
 * Parses a function call's arguments.
 *
 * @param json The arguments' JSON.
 * @return The arguments, or `undefined` when the JSON is not valid.
 */
function parseArguments( json: string ): unknown {
	try {
		return JSON.parse( json );
	} catch {
		return undefined;
	}
}
