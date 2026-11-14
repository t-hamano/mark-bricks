/**
 * External dependencies
 */
import type { AiActivity, AiChatRequest } from '@mark-bricks/editor';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { toEdit } from './edit-tool';
import { AiError } from './error';
import type { AiProviderAdapter } from './provider';
import { createSseParser } from './sse';
import type { AiTransport } from './transport-type';

export type ChatOptions = {
	provider: AiProviderAdapter;
	transport: AiTransport;
	/**
	 * Defaults to the provider's default model.
	 */
	model?: string;
};

/**
 * Creates the `chat` function of `Platform.ai` for a provider.
 *
 * When the model edits the selection, the edit is reported, and the
 * conversation continues in a second request so that the model can say
 * what it changed. That request does not allow another edit.
 *
 * @param options           The provider, the transport, and the model.
 * @param options.provider
 * @param options.transport
 * @param options.model
 */
export function createChat( {
	provider,
	transport,
	model = provider.defaultModel,
}: ChatOptions ) {
	const streamAnswer = async (
		body: object,
		onText: ( text: string ) => void,
		onActivity: ( activity: AiActivity ) => void,
		signal: AbortSignal
	) => {
		const answer = provider.readAnswer( onText, onActivity );
		const parser = createSseParser( answer.handle );
		await transport( body, parser.push, signal );
		parser.end();
		return answer.finish();
	};

	return async function chat( {
		system,
		messages,
		onEvent,
		signal,
	}: AiChatRequest ): Promise< void > {
		let hasText = false;
		const onText = ( text: string ) => {
			hasText = true;
			onEvent( { type: 'text', text } );
		};
		const onActivity = ( activity: AiActivity ) =>
			onEvent( { type: 'activity', activity } );

		const first = await streamAnswer(
			provider.buildRequest( { model, system, messages } ),
			onText,
			onActivity,
			signal
		);
		if ( ! first.editCall ) {
			return;
		}
		const edit = toEdit( first.editCall.input );
		if ( ! edit ) {
			throw new AiError(
				__(
					'The edit from the model could not be read.',
					'mark-bricks'
				)
			);
		}
		onEvent( { type: 'edit', edit } );

		if ( signal.aborted ) {
			throw new DOMException( 'The answer was stopped.', 'AbortError' );
		}

		// Separate the text before the edit from the text after it.
		let needsSeparator = hasText;
		await streamAnswer(
			provider.buildRequest( {
				model,
				system,
				messages,
				continuation: first.continuation,
			} ),
			( text ) => {
				if ( needsSeparator ) {
					needsSeparator = false;
					onText( '\n\n' );
				}
				onText( text );
			},
			onActivity,
			signal
		);
	};
}
