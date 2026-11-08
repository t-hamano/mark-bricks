/**
 * External dependencies
 */
import type { AiEdit, AiMessage } from '@mark-bricks/editor';

export const DEFAULT_MODEL = 'claude-opus-5-5';

export const EDIT_TOOL_NAME = 'edit_selection';

const MAX_TOKENS = 64000;

/**
 * The text sent back to the model after it edits the selection.
 */
const EDIT_RESULT = 'The edit was applied.';

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

export type RequestBody = {
	model: string;
	max_tokens: number;
	stream: true;
	system: string;
	messages: MessageParam[];
	tools: unknown[];
	tool_choice:
		{ type: 'auto'; disable_parallel_tool_use: true } | { type: 'none' };
	output_config: { effort: 'medium' };
	fallbacks: 'default';
};

const EDIT_TOOL = {
	name: EDIT_TOOL_NAME,
	description:
		'Edits the document at the selection. Use it when the user asks you to write or change content. "replace" replaces the selection with the Markdown, and "insert_after" inserts the Markdown after the selection.',
	strict: true,
	input_schema: {
		type: 'object',
		properties: {
			action: {
				type: 'string',
				enum: [ 'replace', 'insert_after' ],
				description: 'How to apply the Markdown to the selection.',
			},
			markdown: {
				type: 'string',
				description:
					'The new content in Markdown, without the selection markers.',
			},
		},
		required: [ 'action', 'markdown' ],
		additionalProperties: false,
	},
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
		input: { action: edit.action, markdown: edit.markdown },
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
		system,
		messages,
		// The tool stays declared when it may no longer be called, so the
		// request keeps the same tools as the one before it.
		tools: [ EDIT_TOOL ],
		// One edit per answer, since the selection changes after an edit.
		tool_choice: allowEditTool
			? { type: 'auto', disable_parallel_tool_use: true }
			: { type: 'none' },
		output_config: { effort: 'medium' },
		// When the model declines, the API answers with the model Anthropic
		// recommends instead. It needs a beta, which the proxy sends.
		fallbacks: 'default',
	};
}
