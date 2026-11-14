/**
 * External dependencies
 */
import {
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	type FormEvent,
	type KeyboardEvent,
} from 'react';

/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { arrowUp } from '@wordpress/icons';
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
import type { AiPlatform, AiUsage } from '../../ai/types';
import { AnswerMarkdown } from './answer-markdown';

// A filled square, the usual stop symbol. `@wordpress/icons` has none.
const stopIcon = (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<path d="M7 7h10v10H7z" fill="currentColor" />
	</svg>
);

/**
 * What the indicator says while the model is not writing text.
 *
 * @param activity What the model is doing.
 */
function getActivityLabel(
	activity: NonNullable< AssistantChatMessage[ 'activity' ] >
) {
	switch ( activity ) {
		case 'thinking':
			return __( 'Thinking…', 'mark-bricks' );
		case 'editing':
			return __( 'Editing the document…', 'mark-bricks' );
		default:
			return __( 'Waiting for the answer…', 'mark-bricks' );
	}
}

const numberFormat = new Intl.NumberFormat();

/**
 * Describes the tokens an answer used. The tokens read from the prompt
 * cache are shown when there are any.
 *
 * @param usage The tokens the answer used.
 * @return The description.
 */
function formatUsage( usage: AiUsage ): string {
	if ( usage.cachedInputTokens ) {
		return sprintf(
			/* translators: 1: The number of tokens the AI model read. 2: How many of them it read from the cache, at a lower price. 3: The number of tokens it wrote. */
			__(
				'%1$s input tokens (%2$s cached), %3$s output tokens',
				'mark-bricks'
			),
			numberFormat.format( usage.inputTokens ),
			numberFormat.format( usage.cachedInputTokens ),
			numberFormat.format( usage.outputTokens )
		);
	}
	return sprintf(
		/* translators: 1: The number of tokens the AI model read. 2: The number of tokens it wrote. */
		__( '%1$s input tokens, %2$s output tokens', 'mark-bricks' ),
		numberFormat.format( usage.inputTokens ),
		numberFormat.format( usage.outputTokens )
	);
}

function AssistantMessage( { message }: { message: AssistantChatMessage } ) {
	const activity =
		message.status === 'streaming' ? message.activity : undefined;

	return (
		<Stack
			className="ai-chat__message is-assistant"
			direction="column"
			gap="sm"
		>
			{ message.text && (
				<AnswerMarkdown>{ message.text }</AnswerMarkdown>
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
			{ activity && (
				<Stack
					className="ai-chat__activity"
					direction="row"
					align="center"
					gap="sm"
					role="status"
				>
					<Spinner aria-hidden />
					<Text variant="body-sm">
						{ getActivityLabel( activity ) }
					</Text>
				</Stack>
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
			{ message.usage && message.status !== 'streaming' && (
				<Text variant="body-sm" className="ai-chat__message-usage">
					{ formatUsage( message.usage ) }
				</Text>
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
	/**
	 * What is sent as the selection with the next message.
	 */
	selectionSummary: string | null;
};

export function AiChat( { ai, chat, selectionSummary }: Props ) {
	const { conversation, isResponding, send, stop } = chat;
	const [ draft, setDraft ] = useState( '' );
	const [ hasApiKey, setHasApiKey ] = useState< boolean | null >( null );
	const messagesRef = useRef< HTMLDivElement >( null );
	const inputRef = useRef< HTMLTextAreaElement >( null );

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

	// Grow the message box with its text, up to the height the stylesheet
	// allows. `field-sizing: content` is not supported by every webview the
	// apps run in. The width changes the wrapping too, for example while the
	// sidebar opens.
	useLayoutEffect( () => {
		const input = inputRef.current;
		if ( ! input ) {
			return;
		}
		const fitToText = () => {
			input.style.height = 'auto';
			input.style.height = `${ input.scrollHeight }px`;
		};
		fitToText();
		let width = input.clientWidth;
		const observer = new ResizeObserver( () => {
			if ( input.clientWidth !== width ) {
				width = input.clientWidth;
				fitToText();
			}
		} );
		observer.observe( input );
		return () => observer.disconnect();
	}, [ draft ] );

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
				direction="column"
				gap="sm"
			>
				<Stack direction="row" align="flex-end" gap="sm">
					<TextareaControl
						ref={ inputRef }
						className="ai-chat__input"
						label={ __( 'Message', 'mark-bricks' ) }
						hideLabelFromVision
						placeholder={ __(
							'Ask the AI Assistant',
							'mark-bricks'
						) }
						rows={ 1 }
						value={ draft }
						onValueChange={ setDraft }
						onKeyDown={ onKeyDown }
					/>
					{ isResponding ? (
						<IconButton
							icon={ stopIcon }
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
				{ selectionSummary && (
					<Text
						variant="body-sm"
						className="ai-chat__selection"
						aria-live="polite"
					>
						{ selectionSummary }
					</Text>
				) }
			</Stack>
		</Stack>
	);
}
