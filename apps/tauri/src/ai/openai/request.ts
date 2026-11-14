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
} from '../edit-tool';

export { EDIT_TOOL_NAME };

export const DEFAULT_MODEL = 'gpt-6-astra';

export type MessageItem = {
	role: 'user' | 'assistant';
	content: string;
};

export type FunctionCallItem = {
	type: 'function_call';
	call_id: string;
	name: string;
	arguments: string;
};

export type FunctionCallOutputItem = {
	type: 'function_call_output';
	call_id: string;
	output: string;
};

export type InputItem = MessageItem | FunctionCallItem | FunctionCallOutputItem;

export type RequestBody = {
	model: string;
	instructions: string;
	input: InputItem[];
	tools: unknown[];
	tool_choice: 'auto' | 'none';
	parallel_tool_calls: false;
	stream: true;
	store: false;
};

const EDIT_TOOL = {
	type: 'function',
	name: EDIT_TOOL_NAME,
	description: EDIT_TOOL_DESCRIPTION,
	strict: true,
	parameters: EDIT_TOOL_SCHEMA,
};

/**
 * Builds the function call and its output that stand for an edit.
 *
 * @param edit   The edit the model made.
 * @param callId The id that links the call to its output.
 */
export function toEditCallItems( edit: AiEdit, callId: string ) {
	const call: FunctionCallItem = {
		type: 'function_call',
		call_id: callId,
		name: EDIT_TOOL_NAME,
		arguments: JSON.stringify( {
			action: edit.action,
			markdown: edit.markdown,
		} ),
	};
	const output: FunctionCallOutputItem = {
		type: 'function_call_output',
		call_id: callId,
		output: EDIT_RESULT,
	};
	return { call, output };
}

/**
 * Converts the editor's conversation to the Responses API's input items.
 *
 * Only the text and the edits of earlier answers are kept. An answer that
 * edited the document becomes the function call, its output, and then the
 * answer's text.
 *
 * @param messages The conversation, ending with the user's new message.
 */
export function toInputItems( messages: AiMessage[] ): InputItem[] {
	const items: InputItem[] = [];
	messages.forEach( ( message, index ) => {
		if ( message.role === 'user' ) {
			items.push( { role: 'user', content: message.text } );
			return;
		}
		if ( message.edit ) {
			const { call, output } = toEditCallItems(
				message.edit,
				`call_history_${ index }`
			);
			items.push( call, output );
		}
		if ( message.text ) {
			items.push( { role: 'assistant', content: message.text } );
		}
	} );
	return items;
}

/**
 * Builds the body of a streamed Responses API request.
 *
 * @param options               The request.
 * @param options.model         The model to use.
 * @param options.system        The system prompt.
 * @param options.input         The input items.
 * @param options.allowEditTool Whether the model may call the edit tool.
 */
export function buildRequestBody( {
	model,
	system,
	input,
	allowEditTool = true,
}: {
	model: string;
	system: string;
	input: InputItem[];
	allowEditTool?: boolean;
} ): RequestBody {
	return {
		model,
		instructions: system,
		input,
		// The tool stays declared when it may no longer be called, so the
		// request keeps the same tools as the one before it.
		tools: [ EDIT_TOOL ],
		tool_choice: allowEditTool ? 'auto' : 'none',
		// One edit per answer, since the selection changes after an edit.
		parallel_tool_calls: false,
		stream: true,
		// The conversation is sent in full with each request, so OpenAI
		// does not need to keep it.
		store: false,
	};
}
