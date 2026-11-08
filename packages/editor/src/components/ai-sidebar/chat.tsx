/**
 * External dependencies
 */
import {
	useEffect,
	useRef,
	useState,
	type FormEvent,
	type KeyboardEvent,
} from 'react';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { arrowUp, square } from '@wordpress/icons';
import { isKeyboardEvent } from '@wordpress/keycodes';
import {
	IconButton,
	Notice,
	Spinner,
	Stack,
	Text,
	TextareaControl,
} from '@wordpress/ui';

/**
 * Internal dependencies
 */
import type { AssistantChatMessage, ChatMessage } from '../../ai/conversation';
import type { AiChat as AiChatState } from '../../ai/use-ai-chat';
import type { AiPlatform } from '../../platform';

function AssistantMessage( { message }: { message: AssistantChatMessage } ) {
	const isWaiting =
		message.status === 'streaming' && ! message.text && ! message.edit;

	return (
		<Stack
			className="ai-chat__message is-assistant"
			direction="column"
			gap="sm"
		>
			{ isWaiting && (
				<Spinner
					aria-label={ __(
						'Waiting for the answer…',
						'mark-bricks'
					) }
				/>
			) }
			{ message.text && (
				<Text className="ai-chat__message-text">{ message.text }</Text>
			) }
			{ message.editStatus === 'applied' && (
				<Text variant="body-sm" className="ai-chat__message-status">
					{ __( 'Edited the document.', 'mark-bricks' ) }
				</Text>
			) }
			{ message.editStatus === 'dropped' && (
				<Text variant="body-sm" className="ai-chat__message-status">
					{ __(
						'The edit was not applied because the selection changed, for example by switching editors.',
						'mark-bricks'
					) }
				</Text>
			) }
			{ message.status === 'stopped' && (
				<Text variant="body-sm" className="ai-chat__message-status">
					{ __( 'Stopped.', 'mark-bricks' ) }
				</Text>
			) }
			{ message.status === 'error' && (
				<Notice.Root intent="error">
					<Notice.Description>
						{ message.error ||
							__(
								'The answer could not be loaded.',
								'mark-bricks'
							) }
					</Notice.Description>
				</Notice.Root>
			) }
		</Stack>
	);
}

function Message( { message }: { message: ChatMessage } ) {
	if ( message.role === 'assistant' ) {
		return <AssistantMessage message={ message } />;
	}
	return (
		<div className="ai-chat__message is-user">
			<Text className="ai-chat__message-text">{ message.text }</Text>
		</div>
	);
}

type Props = {
	ai: AiPlatform;
	chat: AiChatState;
};

export function AiChat( { ai, chat }: Props ) {
	const { conversation, isResponding, send, stop } = chat;
	const [ draft, setDraft ] = useState( '' );
	const [ hasApiKey, setHasApiKey ] = useState< boolean | null >( null );
	const messagesRef = useRef< HTMLDivElement >( null );

	useEffect( () => {
		let cancelled = false;
		ai.hasApiKey().then(
			( result ) => ! cancelled && setHasApiKey( result ),
			() => ! cancelled && setHasApiKey( false )
		);
		return () => {
			cancelled = true;
		};
	}, [ ai ] );

	// Keep the latest message in view while the answer streams in.
	useEffect( () => {
		const element = messagesRef.current;
		if ( element ) {
			element.scrollTop = element.scrollHeight;
		}
	}, [ conversation ] );

	const canSend = !! draft.trim() && ! isResponding;

	const submit = async () => {
		if ( ! canSend ) {
			return;
		}
		// The key may have been set in the settings since the last check.
		if ( hasApiKey === false ) {
			const result = await ai.hasApiKey().catch( () => false );
			setHasApiKey( result );
			if ( ! result ) {
				return;
			}
		}
		send( draft );
		setDraft( '' );
	};

	const onSubmit = ( event: FormEvent ) => {
		event.preventDefault();
		submit();
	};

	// Enter sends, and Shift+Enter adds a line. Enter that confirms an IME
	// conversion does neither.
	const onKeyDown = ( event: KeyboardEvent< HTMLTextAreaElement > ) => {
		// Undo and redo act on the draft, not on the document.
		if (
			isKeyboardEvent.primary( event.nativeEvent, 'z' ) ||
			isKeyboardEvent.primaryShift( event.nativeEvent, 'z' ) ||
			isKeyboardEvent.primary( event.nativeEvent, 'y' )
		) {
			event.stopPropagation();
			return;
		}
		if (
			event.key === 'Enter' &&
			! event.shiftKey &&
			! event.nativeEvent.isComposing
		) {
			event.preventDefault();
			submit();
		}
	};

	return (
		<Stack className="ai-chat" direction="column">
			<div className="ai-chat__messages" ref={ messagesRef }>
				{ hasApiKey === false && (
					<Notice.Root intent="warning">
						<Notice.Description>
							{ __(
								'Set an API key to use the AI Assistant.',
								'mark-bricks'
							) }
						</Notice.Description>
						{ ai.openSettings && (
							<Notice.Actions>
								<Notice.ActionButton
									onClick={ () => ai.openSettings?.() }
								>
									{ __( 'Open settings', 'mark-bricks' ) }
								</Notice.ActionButton>
							</Notice.Actions>
						) }
					</Notice.Root>
				) }
				{ conversation.messages.length === 0 && hasApiKey && (
					<Text variant="body-sm" className="ai-chat__intro">
						{ __(
							'Ask the AI Assistant to write or edit. Your selection, or the line the cursor is on in the code editor, is sent with your message.',
							'mark-bricks'
						) }
					</Text>
				) }
				{ conversation.messages.map( ( message ) => (
					<Message key={ message.id } message={ message } />
				) ) }
			</div>
			<Stack
				render={ <form onSubmit={ onSubmit } /> }
				className="ai-chat__composer"
				direction="row"
				align="flex-end"
				gap="sm"
			>
				<TextareaControl
					className="ai-chat__input"
					label={ __( 'Message', 'mark-bricks' ) }
					hideLabelFromVision
					placeholder={ __( 'Ask the AI Assistant', 'mark-bricks' ) }
					rows={ 3 }
					value={ draft }
					onValueChange={ setDraft }
					onKeyDown={ onKeyDown }
				/>
				{ isResponding ? (
					<IconButton
						icon={ square }
						label={ __( 'Stop', 'mark-bricks' ) }
						tone="neutral"
						size="compact"
						onClick={ stop }
					/>
				) : (
					<IconButton
						type="submit"
						icon={ arrowUp }
						label={ __( 'Send', 'mark-bricks' ) }
						size="compact"
						disabled={ ! canSend }
					/>
				) }
			</Stack>
		</Stack>
	);
}
