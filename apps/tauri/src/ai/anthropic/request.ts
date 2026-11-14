/**
 * External dependencies
 */
import type { AiEdit, AiMessage } from '@mark-bricks/editor';

/**
 * Internal dependencies
 */
import {
	EDIT_RESULT,
	EDIT_TOOL_DESCRIPTION,
	EDIT_TOOL_NAME,
	EDIT_TOOL_SCHEMA,
	toToolInput,
} from '../edit-tool';

export { EDIT_TOOL_NAME };

export const DEFAULT_MODEL = 'claude-opus-5-5';

const MAX_TOKENS = 64000;

/**
 * Marks the end of a part of the request that the API keeps in its prompt
 * cache, so that a later request starting with the same part reads it for
 * a fraction of the price.
 */
export type CacheControl = { type: 'ephemeral' };

export type TextBlock = {
	type: 'text';
	text: string;
	cache_control?: CacheControl;
};

export type ToolUseBlock = {
	type: 'tool_use';
	id: string;
	name: string;
	input: unknown;
};

export type ToolResultBlock = {
	type: 'tool_result';
	tool_use_id: string;
	content: string;
	is_error?: boolean;
	cache_control?: CacheControl;
};

/**
 * A block of the model's answer that is sent back to the API as is, such
 * as `thinking`.
 */
export type OpaqueBlock = { type: string; [ key: string ]: unknown };

export type ContentBlock =
	TextBlock | ToolUseBlock | ToolResultBlock | OpaqueBlock;

export type MessageParam = {
	role: 'user' | 'assistant';
	content: string | ContentBlock[];
};

export type SystemBlock = TextBlock;

export type RequestBody = {
	model: string;
	max_tokens: number;
	stream: true;
	system: SystemBlock[];
	messages: MessageParam[];
	tools: unknown[];
	tool_choice: { type: 'auto'; disable_parallel_tool_use: true };
	output_config: { effort: 'medium' };
	fallbacks: 'default';
};

const EDIT_TOOL = {
	name: EDIT_TOOL_NAME,
	description: EDIT_TOOL_DESCRIPTION,
	strict: true,
	input_schema: EDIT_TOOL_SCHEMA,
};

/**
 * Builds the tool use and its result that stand for an edit in an earlier
 * turn.
 *
 * @param edit The edit the model made.
 * @param id   The id that links the tool use to its result.
 */
export function toEditToolRound( edit: AiEdit, id: string ) {
	const use: ToolUseBlock = {
		type: 'tool_use',
		id,
		name: EDIT_TOOL_NAME,
		input: toToolInput( edit ),
	};
	const result: ToolResultBlock = {
		type: 'tool_result',
		tool_use_id: id,
		content: EDIT_RESULT,
	};
	return { use, result };
}

/**
 * Converts the editor's conversation to the Messages API format.
 *
 * Only the text and the edits of earlier answers are kept, so their
 * thinking blocks are not sent back. An answer that
 * edited the document becomes the tool use, its result, and then the
 * answer's text.
 *
 * @param messages The conversation, ending with the user's new message.
 */
export function toMessageParams( messages: AiMessage[] ): MessageParam[] {
	const params: MessageParam[] = [];
	// Blocks that go at the start of the next user message.
	let pending: ContentBlock[] = [];

	messages.forEach( ( message, index ) => {
		if ( message.role === 'user' ) {
			params.push( {
				role: 'user',
				content: [ ...pending, { type: 'text', text: message.text } ],
			} );
			pending = [];
			return;
		}

		if ( message.edit ) {
			const { use, result } = toEditToolRound(
				message.edit,
				`toolu_history_${ index }`
			);
			params.push( { role: 'assistant', content: [ use ] } );
			if ( ! message.text ) {
				pending = [ result ];
				return;
			}
			params.push( { role: 'user', content: [ result ] } );
		}
		if ( message.text ) {
			params.push( {
				role: 'assistant',
				content: [ { type: 'text', text: message.text } ],
			} );
		}
	} );

	return params;
}

/**
 * Told to the model when it may not edit the document again in this answer.
 * The tool stays available, since changing `tool_choice` would keep the
 * request from reading the messages from the prompt cache.
 */
export const NO_MORE_EDITS =
	'You cannot edit the document again in this answer. Answer in text only.';

/**
 * Marks the last block of the last message as the end of a cache entry, so
 * that the next request, which repeats these messages and adds to them,
 * reads them from the cache. The API finds the entry of an earlier request
 * by looking back from this mark.
 *
 * @param messages      The messages.
 * @param allowEditTool Whether the model may call the edit tool. When it
 *                      may not, the last message says so.
 * @return The messages, with the mark.
 */
export function withCacheBreakpoint(
	messages: MessageParam[],
	allowEditTool: boolean
): MessageParam[] {
	const last = messages[ messages.length - 1 ];
	if ( ! last ) {
		return messages;
	}
	const blocks: ContentBlock[] =
		typeof last.content === 'string'
			? [ { type: 'text', text: last.content } ]
			: [ ...last.content ];
	if ( ! allowEditTool ) {
		blocks.push( { type: 'text', text: NO_MORE_EDITS } );
	}
	const end = blocks[ blocks.length - 1 ];
	blocks[ blocks.length - 1 ] = {
		...end,
		cache_control: { type: 'ephemeral' },
	} as ContentBlock;
	return [ ...messages.slice( 0, -1 ), { ...last, content: blocks } ];
}

/**
 * Builds the body of a streamed Messages API request.
 *
 * @param options               The request.
 * @param options.model         The model to use.
 * @param options.system        The system prompt.
 * @param options.messages      The messages, in the Messages API format.
 * @param options.allowEditTool Whether the model may call the edit tool.
 */
export function buildRequestBody( {
	model,
	system,
	messages,
	allowEditTool = true,
}: {
	model: string;
	system: string;
	messages: MessageParam[];
	allowEditTool?: boolean;
} ): RequestBody {
	return {
		model,
		max_tokens: MAX_TOKENS,
		stream: true,
		// The system prompt, which stays the same through the conversation,
		// is cached together with the tool before it. The messages are
		// cached too: the document comes with the first message, and later
		// messages only add to the conversation.
		// The API rejects an empty text block.
		system: system
			? [
					{
						type: 'text',
						text: system,
						cache_control: { type: 'ephemeral' },
					},
				]
			: [],
		messages: withCacheBreakpoint( messages, allowEditTool ),
		// The tool stays declared when it may no longer be called, so the
		// request keeps the same tools as the one before it.
		tools: [ EDIT_TOOL ],
		// One edit at a time, since the selection changes after an edit.
		// It stays the same when the model may no longer edit, since a
		// change keeps the messages from being read from the cache. The
		// chat ignores an edit the model makes anyway.
		tool_choice: { type: 'auto', disable_parallel_tool_use: true },
		output_config: { effort: 'medium' },
		// When the model declines, the API answers with the model Anthropic
		// recommends instead. It needs a beta, which the proxy sends.
		fallbacks: 'default',
	};
}
