/**
 * External dependencies
 */
import { useCallback, useEffect, useReducer, useRef } from 'react';

/**
 * Internal dependencies
 */
import {
	conversationReducer,
	createConversation,
	toAiMessages,
	type Conversation,
} from './conversation';
import type { EditTarget } from './edit-target';
import { buildSystemPrompt } from './prompt';
import type { AiPlatform } from '../platform';

type EditorMode = 'visual' | 'text';

type UseAiChatArgs = {
	ai: AiPlatform | undefined;
	editorMode: EditorMode;
	/**
	 * Creates the edit target for the active editor mode from the current
	 * selection, or returns `null` when the editor cannot provide one.
	 */
	createTarget: () => EditTarget | null;
};

export type AiChat = {
	conversation: Conversation;
	isResponding: boolean;
	send: ( text: string ) => void;
	stop: () => void;
	reset: () => void;
};

/**
 * Runs a conversation with the AI assistant. The selection is captured when
 * a message is sent, and the model's edits are applied to it as they arrive.
 * An edit is dropped when the editor mode changed after the message was
 * sent.
 *
 * @param args              Arguments.
 * @param args.ai           The host's connection to the model.
 * @param args.editorMode   The active editor mode.
 * @param args.createTarget Creates the edit target for the active mode.
 * @return The conversation and the actions on it.
 */
export function useAiChat( {
	ai,
	editorMode,
	createTarget,
}: UseAiChatArgs ): AiChat {
	const [ conversation, dispatch ] = useReducer(
		conversationReducer,
		undefined,
		createConversation
	);
	const messagesRef = useRef( conversation.messages );
	messagesRef.current = conversation.messages;
	const editorModeRef = useRef( editorMode );
	editorModeRef.current = editorMode;
	const controllerRef = useRef< AbortController | null >( null );

	const send = useCallback(
		( text: string ) => {
			const message = text.trim();
			if ( ! ai || ! message || controllerRef.current ) {
				return;
			}
			const target = createTarget();
			const mode = editorModeRef.current;
			const messages = [
				...toAiMessages( messagesRef.current ),
				{ role: 'user' as const, text: message },
			];
			const controller = new AbortController();
			controllerRef.current = controller;
			dispatch( { type: 'START', text: message } );

			// Once the user stops the answer or starts a new conversation, the
			// request's late events and result are ignored.
			const isCurrent = () =>
				controllerRef.current === controller &&
				! controller.signal.aborted;

			ai.chat( {
				system: buildSystemPrompt( target?.getContext() ?? null ),
				messages,
				signal: controller.signal,
				onEvent( event ) {
					if ( ! isCurrent() ) {
						return;
					}
					if ( event.type === 'text' ) {
						dispatch( { type: 'APPEND_TEXT', text: event.text } );
						return;
					}
					const applied =
						!! target &&
						editorModeRef.current === mode &&
						target.apply( event.edit );
					dispatch( { type: 'EDIT', edit: event.edit, applied } );
				},
			} )
				.then(
					() => {
						if ( isCurrent() ) {
							dispatch( { type: 'FINISH', status: 'done' } );
						}
					},
					( error: unknown ) => {
						if ( isCurrent() ) {
							dispatch( {
								type: 'FINISH',
								status: 'error',
								error:
									error instanceof Error
										? error.message
										: String( error ),
							} );
						}
					}
				)
				.finally( () => {
					if ( controllerRef.current === controller ) {
						controllerRef.current = null;
					}
				} );
		},
		[ ai, createTarget ]
	);

	const stop = useCallback( () => {
		const controller = controllerRef.current;
		if ( ! controller ) {
			return;
		}
		controllerRef.current = null;
		controller.abort();
		dispatch( { type: 'FINISH', status: 'stopped' } );
	}, [] );

	const reset = useCallback( () => {
		const controller = controllerRef.current;
		controllerRef.current = null;
		controller?.abort();
		dispatch( { type: 'RESET' } );
	}, [] );

	// Abandon the answer when the editor closes, so its late edits do not
	// reach a document that is gone.
	useEffect(
		() => () => {
			const controller = controllerRef.current;
			controllerRef.current = null;
			controller?.abort();
		},
		[]
	);

	const last = conversation.messages[ conversation.messages.length - 1 ];
	const isResponding =
		last?.role === 'assistant' && last.status === 'streaming';

	return { conversation, isResponding, send, stop, reset };
}
