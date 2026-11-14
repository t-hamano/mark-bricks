/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { createStreamError, OpenAiError } from './errors';
import type { FunctionCallItem, OutputItem as ReplayItem } from './request';

type OutputItem = {
	type: string;
	[ key: string ]: unknown;
	call_id?: string;
	name?: string;
	arguments?: string;
	content?: { type: string }[];
};

type StreamEvent = {
	type: string;
	delta?: string;
	item?: OutputItem;
	response?: {
		status?: string;
		incomplete_details?: { reason?: string } | null;
		error?: { code?: string | null; message?: string | null } | null;
	};
	code?: string | null;
	message?: string | null;
	error?: { code?: string | null; message?: string | null };
};

export type StreamedResponse = {
	/**
	 * The text of the answer.
	 */
	text: string;
	/**
	 * The function calls the model made, in order.
	 */
	functionCalls: FunctionCallItem[];
	/**
	 * The output items to send back to continue the answer, in order: its
	 * reasoning, messages, and function calls, as the API sent them.
	 */
	outputItems: ReplayItem[];
	/**
	 * Whether the model declined to answer.
	 */
	refused: boolean;
	/**
	 * Why the answer stopped early, such as `max_output_tokens`, or `null`
	 * when it is complete.
	 */
	incompleteReason: string | null;
};

/**
 * Builds a response from the events of a streamed Responses API response.
 *
 * @param onText Called with each piece of the answer's text.
 * @return `handle` takes each event, and `finish` returns the response.
 */
export function createResponseStream( onText: ( text: string ) => void ) {
	let text = '';
	const functionCalls: FunctionCallItem[] = [];
	const outputItems: ReplayItem[] = [];
	let refused = false;
	let incompleteReason: string | null = null;
	let isComplete = false;

	const handle = ( data: unknown ) => {
		const event = data as StreamEvent;
		switch ( event.type ) {
			case 'response.output_text.delta':
				if ( event.delta ) {
					text += event.delta;
					onText( event.delta );
				}
				return;
			case 'response.refusal.delta':
				refused = true;
				return;
			case 'response.output_item.done': {
				const item = event.item;
				if (
					item &&
					[ 'reasoning', 'message', 'function_call' ].includes(
						item.type
					)
				) {
					outputItems.push( item );
				}
				if (
					item?.type === 'function_call' &&
					item.call_id &&
					item.name
				) {
					functionCalls.push( {
						type: 'function_call',
						call_id: item.call_id,
						name: item.name,
						arguments: item.arguments ?? '',
					} );
				} else if (
					item?.type === 'message' &&
					item.content?.some( ( part ) => part.type === 'refusal' )
				) {
					refused = true;
				}
				return;
			}
			case 'response.completed':
				isComplete = true;
				return;
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

	const finish = (): StreamedResponse => {
		// The response ended before the API finished it, for example
		// because the connection dropped.
		if ( ! isComplete ) {
			throw new OpenAiError(
				__(
					'The connection closed before the answer was complete.',
					'mark-bricks'
				)
			);
		}
		return {
			text,
			functionCalls,
			outputItems,
			refused,
			incompleteReason,
		};
	};

	return { handle, finish };
}
