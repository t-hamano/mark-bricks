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

export const DEFAULT_MODEL = 'gemini-3.6-flash';

export type FunctionCall = {
	id?: string;
	name: string;
	args?: unknown;
};

/**
 * A part of a message. Parts the model wrote are sent back as the API sent
 * them, with their thought signatures.
 */
export type Part = {
	text?: string;
	thought?: boolean;
	thoughtSignature?: string;
	functionCall?: FunctionCall;
	functionResponse?: {
		id?: string;
		name: string;
		response: { result: string };
	};
	[ key: string ]: unknown;
};

export type Content = {
	role: 'user' | 'model';
	parts: Part[];
};

export type RequestBody = {
	/**
	 * The API names the model in the URL. The native side takes it out of
	 * the body to build the URL.
	 */
	model: string;
	systemInstruction: { parts: [ { text: string } ] };
	contents: Content[];
	tools: unknown[];
	toolConfig: {
		functionCallingConfig: { mode: 'AUTO' | 'NONE' };
	};
	generationConfig: {
		thinkingConfig: { includeThoughts: true };
	};
};

const EDIT_TOOL = {
	functionDeclarations: [
		{
			name: EDIT_TOOL_NAME,
			description: EDIT_TOOL_DESCRIPTION,
			parametersJsonSchema: EDIT_TOOL_SCHEMA,
		},
	],
};

/**
 * Builds the message that tells the model its edit was applied.
 *
 * @param call The model's call of the edit tool.
 */
export function toEditResponse( call: FunctionCall ): Content {
	return {
		role: 'user',
		parts: [
			{
				functionResponse: {
					...( call.id ? { id: call.id } : {} ),
					name: EDIT_TOOL_NAME,
					response: { result: EDIT_RESULT },
				},
			},
		],
	};
}

/**
 * Builds the function call and its response that stand for an edit of an
 * earlier answer.
 *
 * @param edit The edit the model made.
 */
function toEditContents( edit: AiEdit ): Content[] {
	const call: FunctionCall = {
		name: EDIT_TOOL_NAME,
		args: { action: edit.action, markdown: edit.markdown },
	};
	return [
		{ role: 'model', parts: [ { functionCall: call } ] },
		toEditResponse( call ),
	];
}

/**
 * Adds a message to the contents. A message of the same role as the one
 * before it joins that one.
 *
 * @param contents The contents.
 * @param content  The message.
 */
function append( contents: Content[], content: Content ) {
	const last = contents[ contents.length - 1 ];
	if ( last && last.role === content.role ) {
		last.parts.push( ...content.parts );
	} else {
		contents.push( { role: content.role, parts: [ ...content.parts ] } );
	}
}

/**
 * Converts the editor's conversation to the Gemini API's contents.
 *
 * Only the text and the edits of earlier answers are kept. An answer that
 * edited the document becomes the function call, its response, and then
 * the answer's text.
 *
 * @param messages     The conversation, ending with the user's new message.
 * @param continuation The messages that continue the answer after its edit.
 */
export function toContents(
	messages: AiMessage[],
	continuation: Content[] = []
): Content[] {
	const contents: Content[] = [];
	messages.forEach( ( message ) => {
		if ( message.role === 'user' ) {
			append( contents, {
				role: 'user',
				parts: [ { text: message.text } ],
			} );
			return;
		}
		if ( message.edit ) {
			toEditContents( message.edit ).forEach( ( content ) =>
				append( contents, content )
			);
		}
		if ( message.text ) {
			append( contents, {
				role: 'model',
				parts: [ { text: message.text } ],
			} );
		}
	} );
	continuation.forEach( ( content ) => append( contents, content ) );
	return contents;
}

/**
 * Builds the body of a streamed Gemini API request.
 *
 * @param options               The request.
 * @param options.model         The model to use.
 * @param options.system        The system prompt.
 * @param options.contents      The conversation.
 * @param options.allowEditTool Whether the model may call the edit tool.
 */
export function buildRequestBody( {
	model,
	system,
	contents,
	allowEditTool = true,
}: {
	model: string;
	system: string;
	contents: Content[];
	allowEditTool?: boolean;
} ): RequestBody {
	return {
		model,
		systemInstruction: { parts: [ { text: system } ] },
		contents,
		// The tool stays declared when it may no longer be called, so the
		// request keeps the same tools as the one before it.
		tools: [ EDIT_TOOL ],
		toolConfig: {
			functionCallingConfig: { mode: allowEditTool ? 'AUTO' : 'NONE' },
		},
		// The thoughts are not shown, but they tell when the model thinks.
		generationConfig: { thinkingConfig: { includeThoughts: true } },
	};
}
