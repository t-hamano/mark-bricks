/**
 * External dependencies
 */
import type { AiActivity } from '@mark-bricks/editor';

/**
 * Internal dependencies
 */
import { EDIT_RESULT } from '../edit-tool';
import { lengthLimitError, refusalError } from '../error';
import type { ProviderAnswer } from '../provider';
import { createMessageStream, type StreamedMessage } from './message-stream';
import {
	EDIT_TOOL_NAME,
	type ContentBlock,
	type MessageParam,
	type ToolUseBlock,
} from './request';

/**
 * Reads a streamed Messages API answer. See `AiProviderAdapter.readAnswer`.
 *
 * @param onText     Called with each piece of the answer's text.
 * @param onActivity Called when the model starts to think, or to edit.
 */
export function readAnswer(
	onText: ( text: string ) => void,
	onActivity: ( activity: AiActivity ) => void
) {
	const message = createMessageStream( onText, onActivity );
	return {
		handle: message.handle,
		finish: (): ProviderAnswer => toAnswer( message.finish() ),
	};
}

function toAnswer( message: StreamedMessage ): ProviderAnswer {
	if ( message.stopReason === 'refusal' ) {
		throw refusalError();
	}
	if ( message.stopReason === 'max_tokens' ) {
		throw lengthLimitError();
	}
	const content = toEchoContent( message.content );
	// A tool use from before a switch to a fallback model does not count.
	const toolUse =
		message.stopReason === 'tool_use'
			? content.find(
					( block ): block is ToolUseBlock =>
						block.type === 'tool_use' &&
						( block as ToolUseBlock ).name === EDIT_TOOL_NAME
				)
			: undefined;
	const { usage } = message;
	if ( ! toolUse ) {
		return { continuation: [], usage };
	}
	const continuation: MessageParam[] = [
		{ role: 'assistant', content },
		{
			role: 'user',
			content: [
				{
					type: 'tool_result',
					tool_use_id: toolUse.id,
					content: EDIT_RESULT,
				},
			],
		},
	];
	return { editCall: { input: toolUse.input }, continuation, usage };
}

/**
 * Prepares the model's answer to be sent back with the tool's result.
 * Blocks stay as the API sent them, including thinking blocks, which the
 * API needs to continue the same answer. Empty text blocks are left out,
 * since the API rejects them.
 *
 * After the API switched to a fallback model mid-answer, the thinking and
 * tool use blocks from before the switch are left out, and so are the
 * `fallback` blocks themselves.
 *
 * @param content The answer's content blocks.
 */
export function toEchoContent( content: ContentBlock[] ): ContentBlock[] {
	let lastFallback = -1;
	content.forEach( ( block, index ) => {
		if ( block.type === 'fallback' ) {
			lastFallback = index;
		}
	} );
	return content.filter( ( block, index ) => {
		if ( block.type === 'fallback' ) {
			return false;
		}
		if ( block.type === 'text' ) {
			return !! ( block as { text?: string } ).text;
		}
		if (
			index < lastFallback &&
			[ 'thinking', 'redacted_thinking', 'tool_use' ].includes(
				block.type
			)
		) {
			return false;
		}
		return true;
	} );
}
