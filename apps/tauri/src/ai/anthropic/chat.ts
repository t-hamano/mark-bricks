/**
 * External dependencies
 */
import type { AiChatRequest } from '@mark-bricks/editor';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { toEdit } from '../edit-tool';
import type { AiTransport } from '../transport-type';
import { AnthropicError } from './errors';
import { createMessageStream, type StreamedMessage } from './message-stream';
import {
	buildRequestBody,
	DEFAULT_MODEL,
	EDIT_TOOL_NAME,
	toEditToolRound,
	toMessageParams,
	type ContentBlock,
	type MessageParam,
	type RequestBody,
	type ToolUseBlock,
} from './request';
import { createSseParser } from '../sse';

/**
 * Sends a request to the Messages API. See `AiTransport`.
 */
export type AnthropicTransport = AiTransport< RequestBody >;

export type AnthropicChatOptions = {
	transport: AnthropicTransport;
	/**
	 * Defaults to `DEFAULT_MODEL`.
	 */
	model?: string;
};

/**
 * Creates the `chat` function of `Platform.ai` for the Anthropic API.
 *
 * When the model edits the selection, the edit is reported, and the
 * conversation continues in a second request so that the model can say
 * what it changed. That request does not allow another edit.
 *
 * @param options           The transport, and the model.
 * @param options.transport
 * @param options.model
 */
export function createAnthropicChat( {
	transport,
	model = DEFAULT_MODEL,
}: AnthropicChatOptions ) {
	const streamMessage = async (
		body: RequestBody,
		onText: ( text: string ) => void,
		signal: AbortSignal
	) => {
		const message = createMessageStream( onText );
		const parser = createSseParser( message.handle );
		await transport( body, parser.push, signal );
		parser.end();
		return message.finish();
	};

	return async function chat( {
		system,
		messages,
		onEvent,
		signal,
	}: AiChatRequest ): Promise< void > {
		const params = toMessageParams( messages );
		let hasText = false;
		const onText = ( text: string ) => {
			hasText = true;
			onEvent( { type: 'text', text } );
		};

		const first = await streamMessage(
			buildRequestBody( { model, system, messages: params } ),
			onText,
			signal
		);
		checkStopReason( first );

		const toolUse = findEditToolUse( first );
		if ( ! toolUse ) {
			return;
		}
		const edit = toEdit( toolUse.input );
		if ( ! edit ) {
			throw new AnthropicError(
				__(
					'The edit from the model could not be read.',
					'mark-bricks'
				)
			);
		}
		onEvent( { type: 'edit', edit } );

		if ( signal.aborted ) {
			throw new DOMException( 'The answer was stopped.', 'AbortError' );
		}

		// Separate the text before the edit from the text after it.
		let needsSeparator = hasText;
		const { result } = toEditToolRound( edit, toolUse.id );
		const continuation: MessageParam[] = [
			...params,
			{ role: 'assistant', content: toEchoContent( first.content ) },
			{ role: 'user', content: [ result ] },
		];
		const second = await streamMessage(
			buildRequestBody( {
				model,
				system,
				messages: continuation,
				allowEditTool: false,
			} ),
			( text ) => {
				if ( needsSeparator ) {
					needsSeparator = false;
					onText( '\n\n' );
				}
				onText( text );
			},
			signal
		);
		checkStopReason( second );
	};
}

/**
 * Throws when the answer did not end normally.
 *
 * @param message The streamed message.
 */
function checkStopReason( message: StreamedMessage ) {
	if ( message.stopReason === 'refusal' ) {
		throw new AnthropicError(
			__( 'The model declined to answer this request.', 'mark-bricks' ),
			'refusal'
		);
	}
	if ( message.stopReason === 'max_tokens' ) {
		throw new AnthropicError(
			__(
				'The answer was cut off because it reached the length limit.',
				'mark-bricks'
			),
			'max_tokens'
		);
	}
}

function findEditToolUse( message: StreamedMessage ) {
	if ( message.stopReason !== 'tool_use' ) {
		return undefined;
	}
	// A tool use from before a switch to a fallback model does not count.
	return toEchoContent( message.content ).find(
		( block ): block is ToolUseBlock =>
			block.type === 'tool_use' &&
			( block as ToolUseBlock ).name === EDIT_TOOL_NAME
	);
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
