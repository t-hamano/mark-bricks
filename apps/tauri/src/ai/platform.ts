/**
 * External dependencies
 */
import type { AiPlatform } from '@mark-bricks/editor/ai';

/**
 * WordPress dependencies
 */
import { dispatch, select } from '@wordpress/data';
import { store as preferencesStore } from '@wordpress/preferences';

/**
 * Internal dependencies
 */
import { createChat } from './chat';
import { withCustomInstructions } from './instructions';
import {
	getModelOf,
	PROVIDERS,
	toProvider,
	type AiProvider,
} from './providers';
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
	const provider = getChosenProvider();
	const model = getModelOf(
		select( preferencesStore ).get( 'mark-bricks', 'aiModels' ),
		provider
	);
	return model || PROVIDERS[ provider ].defaultModel;
}

/**
 * The Tauri implementation of `Platform.ai`: the chosen provider's API,
 * through the `ai_request` command, with the API key and the model from the
 * settings.
 */
export const aiPlatform: AiPlatform = {
	async hasApiKey() {
		const chosen = getChosenProvider();
		if ( await hasApiKey( chosen ) ) {
			return true;
		}
		// The chosen provider has no key, but another one may: one whose key
		// was saved after the settings were closed, before the panel could
		// choose it. The assistant then uses that one.
		for ( const provider of Object.keys( PROVIDERS ) as AiProvider[] ) {
			if ( provider !== chosen && ( await hasApiKey( provider ) ) ) {
				dispatch( preferencesStore ).set(
					'mark-bricks',
					'aiProvider',
					provider
				);
				return true;
			}
		}
		return false;
	},
	chat( request ) {
		// The provider, the model, and the custom instructions are read for each message, so that the
		// ones changed during the conversation are used for the next message.
		const provider = getChosenProvider();
		const chat = createChat( {
			provider: PROVIDERS[ provider ],
			transport: createTauriTransport( provider ),
			model: getChosenModel(),
		} );
		return chat( {
			...request,
			system: withCustomInstructions(
				request.system,
				select( preferencesStore ).get(
					'mark-bricks',
					'aiInstructions'
				)
			),
		} );
	},
	openSettings() {
		openPreferences( 'ai' );
	},
};
