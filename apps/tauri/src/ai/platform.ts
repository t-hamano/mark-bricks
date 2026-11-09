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
import { createAnthropicChat, DEFAULT_MODEL } from './anthropic';
import { hasApiKey } from './settings';
import { createTauriTransport } from './transport';
import { openPreferences } from '../components/preferences-modal/open';

/**
 * The model chosen in the preferences, or the default model.
 */
export function getChosenModel(): string {
	const model = select( preferencesStore ).get( 'mark-bricks', 'aiModel' );
	return typeof model === 'string' && model ? model : DEFAULT_MODEL;
}

/**
 * The Tauri implementation of `Platform.ai`: the Anthropic API, through the
 * `ai_request` command, with the API key and the model from the settings.
 */
export const aiPlatform: AiPlatform = {
	hasApiKey,
	chat( request ) {
		// The model is read for each message, so that a model chosen during
		// the conversation is used for the next message.
		const chat = createAnthropicChat( {
			transport: createTauriTransport(),
			model: getChosenModel(),
		} );
		return chat( request );
	},
	openSettings() {
		openPreferences( 'ai' );
	},
};
