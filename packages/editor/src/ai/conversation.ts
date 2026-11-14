/**
 * External dependencies
 */
import { v4 as uuid } from 'uuid';

/**
 * Internal dependencies
 */
import type { AiActivity, AiEdit, AiMessage, AiUsage } from '../platform';

export type UserChatMessage = {
	id: string;
	role: 'user';
	text: string;
	/**
	 * What the model was told about the document with this message, fixed
	 * when it was sent. It is sent again as is with later messages, so the
	 * start of the conversation stays the same and the prompt cache covers
	 * it. Omitted when the document was not available.
	 */
	context?: string;
};

export type AssistantChatMessage = {
	id: string;
	role: 'assistant';
	text: string;
	status: 'streaming' | 'done' | 'stopped' | 'error';
	/**
	 * What the model is doing while the answer streams and no text is
	 * arriving. `waiting` until the model starts, and again after an edit,
	 * while the model goes on to say what it changed.
	 */
	activity?: 'waiting' | AiActivity;
	edit?: AiEdit;
	/**
	 * `applied` when the edit changed the document, and `dropped` when the
	 * selection it was for no longer exists, for example after switching
	 * editor modes.
	 */
	editStatus?: 'applied' | 'dropped';
	/**
	 * The tokens the answer used, added up over its requests. Omitted when
	 * the host did not report them.
	 */
	usage?: AiUsage;
	error?: string;
	/**
	 * The document when the answer ended, with the answer's edits in it,
	 * and the editor mode it was read in. The next message tells the model
	 * what changed since. Omitted when the document was not available then,
	 * for example after switching editor modes.
	 */
	documentAfter?: DocumentSnapshot;
};

/**
 * The document as an editor mode wrote it as Markdown.
 */
export type DocumentSnapshot = {
	editorMode: string;
	document: string;
};

export type ChatMessage = UserChatMessage | AssistantChatMessage;

/**
 * A conversation with the AI assistant. It lives in memory only.
 */
export type Conversation = {
	id: string;
	messages: ChatMessage[];
};

export type ConversationAction =
	| { type: 'START'; text: string; context?: string }
	| { type: 'APPEND_TEXT'; text: string }
	| { type: 'ACTIVITY'; activity: AiActivity }
	| { type: 'EDIT'; edit: AiEdit; applied: boolean }
	| { type: 'USAGE'; usage: AiUsage }
	| {
			type: 'FINISH';
			status: 'done' | 'stopped' | 'error';
			error?: string;
			documentAfter?: DocumentSnapshot;
	  }
	| { type: 'RESET' };

export function createConversation(): Conversation {
	return { id: uuid(), messages: [] };
}

/**
 * Updates the answer being streamed, which is always the last message.
 *
 * @param conversation The conversation.
 * @param update       Changes to the answer.
 * @return The conversation with the answer updated.
 */
function updateAnswer(
	conversation: Conversation,
	update: ( message: AssistantChatMessage ) => AssistantChatMessage
): Conversation {
	const last = conversation.messages[ conversation.messages.length - 1 ];
	if ( last?.role !== 'assistant' || last.status !== 'streaming' ) {
		return conversation;
	}
	return {
		...conversation,
		messages: [ ...conversation.messages.slice( 0, -1 ), update( last ) ],
	};
}

export function conversationReducer(
	conversation: Conversation,
	action: ConversationAction
): Conversation {
	switch ( action.type ) {
		case 'START':
			return {
				...conversation,
				messages: [
					...conversation.messages,
					{
						id: uuid(),
						role: 'user',
						text: action.text,
						...( action.context === undefined
							? {}
							: { context: action.context } ),
					},
					{
						id: uuid(),
						role: 'assistant',
						text: '',
						status: 'streaming',
						activity: 'waiting',
					},
				],
			};
		case 'APPEND_TEXT':
			return updateAnswer( conversation, ( message ) => ( {
				...message,
				text: message.text + action.text,
				activity: undefined,
			} ) );
		case 'ACTIVITY':
			return updateAnswer( conversation, ( message ) => ( {
				...message,
				activity: action.activity,
			} ) );
		case 'EDIT':
			return updateAnswer( conversation, ( message ) => ( {
				...message,
				edit: action.edit,
				editStatus: action.applied ? 'applied' : 'dropped',
				activity: 'waiting',
			} ) );
		case 'USAGE':
			return updateAnswer( conversation, ( message ) => ( {
				...message,
				usage: {
					inputTokens:
						( message.usage?.inputTokens ?? 0 ) +
						action.usage.inputTokens,
					outputTokens:
						( message.usage?.outputTokens ?? 0 ) +
						action.usage.outputTokens,
				},
			} ) );
		case 'FINISH':
			return updateAnswer( conversation, ( message ) => ( {
				...message,
				status: action.status,
				activity: undefined,
				error: action.error,
				...( action.documentAfter === undefined
					? {}
					: { documentAfter: action.documentAfter } ),
			} ) );
		case 'RESET':
			return createConversation();
		default:
			return conversation;
	}
}

/**
 * Joins the context of the document and the user's message into the text
 * sent to the model.
 *
 * @param text    The user's message.
 * @param context The context of the document, when there is one.
 * @return The text for the model.
 */
export function toUserText( text: string, context?: string ): string {
	return context === undefined ? text : `${ context }\n\n${ text }`;
}

/**
 * Returns the document as the model last saw it: when the answer to the
 * last message still sent to the model ended. `null` when the model has
 * not seen the document, the answer ended without it, or it was read in
 * another editor mode, which writes the Markdown differently.
 *
 * @param messages   The conversation's messages.
 * @param editorMode The active editor mode.
 * @return The document, or `null`.
 */
export function getLastSeenDocument(
	messages: ChatMessage[],
	editorMode: string
): string | null {
	for ( let index = messages.length - 1; index >= 0; index-- ) {
		const message = messages[ index ];
		if ( message.role !== 'user' ) {
			continue;
		}
		const answer = messages[ index + 1 ];
		// `toAiMessages` leaves out an exchange whose answer failed.
		if ( answer?.role === 'assistant' && answer.status === 'error' ) {
			continue;
		}
		const snapshot =
			answer?.role === 'assistant' ? answer.documentAfter : undefined;
		return snapshot?.editorMode === editorMode ? snapshot.document : null;
	}
	return null;
}

/**
 * Converts the conversation into the messages sent to the model. An
 * exchange whose answer failed is left out, together with its question, and
 * an edit is sent only when it changed the document.
 *
 * @param messages The conversation's messages.
 * @return The messages for the model.
 */
export function toAiMessages( messages: ChatMessage[] ): AiMessage[] {
	const result: AiMessage[] = [];
	messages.forEach( ( message, index ) => {
		if ( message.role === 'user' ) {
			const answer = messages[ index + 1 ];
			if ( answer?.role === 'assistant' && answer.status === 'error' ) {
				return;
			}
			result.push( {
				role: 'user',
				text: toUserText( message.text, message.context ),
			} );
		} else if ( message.status !== 'error' ) {
			const edit =
				message.editStatus === 'applied' ? message.edit : undefined;
			// An answer stopped before it said anything has nothing to send.
			if ( ! message.text && ! edit ) {
				return;
			}
			result.push( {
				role: 'assistant',
				text: message.text,
				...( edit ? { edit } : {} ),
			} );
		}
	} );
	return result;
}
