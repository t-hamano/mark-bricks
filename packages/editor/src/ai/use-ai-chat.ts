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
	getLastSeenDocument,
	toAiMessages,
	toUserText,
	type Conversation,
	type DocumentSnapshot,
} from './conversation';
import { applyChange, buildMessageContext } from './document-context';
import type { EditTarget } from './edit-target';
import { buildSystemPrompt } from './prompt';
import type { AiEditResult, AiPlatform } from './types';

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
 * The first message carries the whole document, and later ones only the
 * lines the user changed since the last answer, so the conversation grows
 * at its end only and the prompt cache covers what came before.
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
	// Reads the document when the answer being streamed ends.
	const readDocumentRef = useRef<
		( () => DocumentSnapshot | undefined ) | null
	>( null );

	const send = useCallback(
		( text: string ) => {
			const message = text.trim();
			if ( ! ai || ! message || controllerRef.current ) {
				return;
			}
			const target = createTarget();
			const mode = editorModeRef.current;
			const context = target?.getContext() ?? null;
			const messageContext = context
				? buildMessageContext(
						context,
						getLastSeenDocument( messagesRef.current, mode )
					)
				: undefined;
			const messages = [
				...toAiMessages( messagesRef.current ),
				{
					role: 'user' as const,
					text: toUserText( message, messageContext ),
				},
			];
			const controller = new AbortController();
			controllerRef.current = controller;
			// The document as the model knows it: as sent, with the model's
			// edits. Changes the user makes while the answer streams are left
			// out, so the next message tells the model about them.
			let seenDocument = context?.document;
			const readDocument = () =>
				seenDocument === undefined
					? undefined
					: { editorMode: mode, document: seenDocument };
			readDocumentRef.current = readDocument;
			dispatch( {
				type: 'START',
				text: message,
				context: messageContext,
			} );

			// Once the user stops the answer or starts a new conversation, the
			// request's late events and result are ignored.
			const isCurrent = () =>
				controllerRef.current === controller &&
				! controller.signal.aborted;

			ai.chat( {
				system: buildSystemPrompt( context?.document ?? null ),
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
					if ( event.type === 'usage' ) {
						dispatch( { type: 'USAGE', usage: event.usage } );
						return;
					}
					if ( event.type === 'activity' ) {
						dispatch( {
							type: 'ACTIVITY',
							activity: event.activity,
						} );
						return;
					}
					const canApply = target && editorModeRef.current === mode;
					const before = canApply ? target.getDocument() : '';
					const result: AiEditResult = canApply
						? target.apply( event.edit )
						: { status: 'dropped' };
					if (
						canApply &&
						result.status === 'applied' &&
						seenDocument !== undefined
					) {
						// When the edit does not fit, the next message sends
						// the whole document.
						seenDocument =
							applyChange(
								seenDocument,
								before,
								target.getDocument()
							) ?? undefined;
					}
					// The model tries again after a failed edit, so the
					// answer shows only the edit that changed the document,
					// or that was dropped.
					if ( result.status !== 'failed' ) {
						dispatch( {
							type: 'EDIT',
							edit: event.edit,
							applied: result.status === 'applied',
						} );
					}
					return result;
				},
			} )
				.then(
					() => {
						if ( isCurrent() ) {
							dispatch( {
								type: 'FINISH',
								status: 'done',
								documentAfter: readDocument(),
							} );
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
		dispatch( {
			type: 'FINISH',
			status: 'stopped',
			documentAfter: readDocumentRef.current?.(),
		} );
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
