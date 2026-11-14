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
	| { type: 'START'; text: string }
	| { type: 'APPEND_TEXT'; text: string }
	| { type: 'ACTIVITY'; activity: AiActivity }
	| { type: 'EDIT'; edit: AiEdit; applied: boolean }
	| { type: 'USAGE'; usage: AiUsage }
	| {
			type: 'FINISH';
			status: 'done' | 'stopped' | 'error';
			error?: string;
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
					{ id: uuid(), role: 'user', text: action.text },
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
			} ) );
		case 'RESET':
			return createConversation();
		default:
			return conversation;
	}
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
			result.push( { role: 'user', text: message.text } );
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
