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

export type TextBlock = { type: 'text'; text: string };

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

/**
 * Marks the end of a part of the request that the API keeps in its prompt
 * cache, so that a later request starting with the same part reads it for
 * a fraction of the price.
 */
export type CacheControl = { type: 'ephemeral' };

export type SystemBlock = TextBlock & { cache_control?: CacheControl };

export type RequestBody = {
	model: string;
	max_tokens: number;
	stream: true;
	system: SystemBlock[];
	messages: MessageParam[];
	tools: unknown[];
	tool_choice:
		{ type: 'auto'; disable_parallel_tool_use: true } | { type: 'none' };
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
 * Only the text and the edits of earlier answers are kept. Their thinking
 * blocks are not sent back: the system prompt changes with the document on
 * every message, so the API would not accept them anyway. An answer that
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
 * Where the document starts in the editor's system prompt.
 */
const DOCUMENT_START = '\n<document>\n';

/**
 * Splits the system prompt into cached blocks.
 *
 * The instructions before the document change only with the selection
 * and the settings, while the document changes with every edit. Ending a
 * cache entry before the document lets a request whose document changed
 * still read the instructions, such as the Marp guide, from the cache.
 *
 * @param system The system prompt.
 * @return The system blocks. Empty for an empty prompt, which the API
 *         rejects as a text block.
 */
export function toSystemBlocks( system: string ): SystemBlock[] {
	if ( ! system ) {
		return [];
	}
	const cacheControl: CacheControl = { type: 'ephemeral' };
	const index = system.indexOf( DOCUMENT_START );
	if ( index <= 0 ) {
		return [ { type: 'text', text: system, cache_control: cacheControl } ];
	}
	return [
		{
			type: 'text',
			text: system.slice( 0, index ),
			cache_control: cacheControl,
		},
		{
			type: 'text',
			text: system.slice( index ),
			cache_control: cacheControl,
		},
	];
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
		// The system prompt is cached together with the tool before it. The
		// request that continues an answer after its edit reads it from the
		// cache, and so does the next message while the document and the
		// selection stay the same.
		// The cache ends here and not after the messages: the continuation
		// changes `tool_choice`, which the API does not let the cached
		// messages outlive.
		system: toSystemBlocks( system ),
		messages,
		// The tool stays declared when it may no longer be called, so the
		// request keeps the same tools as the one before it.
		tools: [ EDIT_TOOL ],
		// One edit at a time, since the selection changes after an edit.
		tool_choice: allowEditTool
			? { type: 'auto', disable_parallel_tool_use: true }
			: { type: 'none' },
		output_config: { effort: 'medium' },
		// When the model declines, the API answers with the model Anthropic
		// recommends instead. It needs a beta, which the proxy sends.
		fallbacks: 'default',
	};
}
