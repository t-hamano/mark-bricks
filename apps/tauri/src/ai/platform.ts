/**
 * External dependencies
 */
import type { AiPlatform } from '@mark-bricks/editor';

/**
 * WordPress dependencies
 */
import { select } from '@wordpress/data';
import { store as preferencesStore } from '@wordpress/preferences';

/**
 * Internal dependencies
 */
import { createChat } from './chat';
import { PROVIDERS, toProvider, type AiProvider } from './providers';
import { hasApiKey } from './settings';
import { createTauriTransport } from './transport';
import { openPreferences } from '../components/preferences-modal/open';

/**
 * The provider chosen in the preferences, or the default provider.
 */
export function getChosenProvider(): AiProvider {
	return toProvider(
		select( preferencesStore ).get( 'mark-bricks', 'aiProvider' )
	);
}

/**
 * The model chosen in the preferences, or the chosen provider's default
 * model.
 */
export function getChosenModel(): string {
	const model = select( preferencesStore ).get( 'mark-bricks', 'aiModel' );
	return typeof model === 'string' && model
		? model
		: PROVIDERS[ getChosenProvider() ].defaultModel;
}

/**
 * The Tauri implementation of `Platform.ai`: the chosen provider's API,
 * through the `ai_request` command, with the API key and the model from the
 * settings.
 */
export const aiPlatform: AiPlatform = {
	hasApiKey() {
		return hasApiKey( getChosenProvider() );
	},
	chat( request ) {
		// The provider and the model are read for each message, so that the
		// ones chosen during the conversation are used for the next message.
		const provider = getChosenProvider();
		const chat = createChat( {
			provider: PROVIDERS[ provider ],
			transport: createTauriTransport( provider ),
			model: getChosenModel(),
		} );
		return chat( request );
	},
	openSettings() {
		openPreferences( 'ai' );
	},
};
