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
import { MAX_EDIT_ATTEMPTS, toEdit } from './edit-tool';
import { AiError } from './error';
import type { AiProviderAdapter, ProviderAnswer } from './provider';
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
 * When the model edits the document, the edit is reported, and the
 * conversation continues in another request so that the model can say
 * what it changed. That request does not allow another edit, unless the
 * edit failed, for example because its text to replace was not in the
 * document: then the model may try again, up to `MAX_EDIT_ATTEMPTS` edits
 * in all.
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

	const reportUsage = (
		{ usage }: ProviderAnswer,
		onEvent: AiChatRequest[ 'onEvent' ]
	) => {
		if ( usage ) {
			onEvent( { type: 'usage', usage } );
		}
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

		let continuation: unknown[] | undefined;
		let allowEditTool = true;
		let attempts = 0;
		while ( true ) {
			// Separate the text before an edit from the text after it.
			let needsSeparator = hasText;
			const answer = await streamAnswer(
				provider.buildRequest( {
					model,
					system,
					messages,
					continuation,
					allowEditTool,
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
			reportUsage( answer, onEvent );
			if ( ! answer.editCall || ! allowEditTool ) {
				return;
			}
			const edit = toEdit( answer.editCall.input );
			if ( ! edit ) {
				throw new AiError(
					__(
						'The edit from the model could not be read.',
						'mark-bricks'
					)
				);
			}
			attempts++;
			const result = onEvent( { type: 'edit', edit } );

			if ( signal.aborted ) {
				throw new DOMException(
					'The answer was stopped.',
					'AbortError'
				);
			}

			// After a failed edit, the model may correct it and try again.
			const error =
				result?.status === 'failed' ? result.reason : undefined;
			continuation = [
				...( continuation ?? [] ),
				...answer.continuation( error ),
			];
			allowEditTool = !! error && attempts < MAX_EDIT_ATTEMPTS;
		}
	};
}
