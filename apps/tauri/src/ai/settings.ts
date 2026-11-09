/**
 * External dependencies
 */
import { invoke } from '@tauri-apps/api/core';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { AnthropicError } from './anthropic';
import { toTransportError } from './transport';

/**
 * The provider whose API key and models the settings manage.
 */
const PROVIDER = 'anthropic';

/**
 * A model the API key can use.
 */
export type AiModel = {
	id: string;
	displayName: string;
};

/**
 * Whether an API key is saved.
 */
export function hasApiKey(): Promise< boolean > {
	return invoke< boolean >( 'has_ai_api_key', { provider: PROVIDER } );
}

/**
 * Checks that the Anthropic API accepts the key, before it is saved. Rejects
 * with an error whose message is written for the user.
 *
 * @param key The API key.
 */
export async function checkApiKey( key: string ): Promise< void > {
	try {
		await invoke( 'check_ai_api_key', { provider: PROVIDER, key } );
	} catch ( error ) {
		const transportError = toTransportError( error );
		if (
			transportError instanceof AnthropicError &&
			transportError.errorType === 'authentication_error'
		) {
			throw new AnthropicError(
				__( 'This API key is not valid.', 'mark-bricks' ),
				transportError.errorType
			);
		}
		throw transportError;
	}
}

/**
 * Saves the API key in the OS credential store, replacing the one saved
 * before.
 *
 * @param key The API key.
 */
export function saveApiKey( key: string ): Promise< void > {
	return invoke( 'save_ai_api_key', { provider: PROVIDER, key } );
}

/**
 * Deletes the saved API key.
 */
export function deleteApiKey(): Promise< void > {
	return invoke( 'delete_ai_api_key', { provider: PROVIDER } );
}

/**
 * Lists the models the saved API key can use, newest first. Rejects with an
 * error whose message is written for the user.
 */
export async function listModels(): Promise< AiModel[] > {
	try {
		return await invoke< AiModel[] >( 'list_ai_models', {
			provider: PROVIDER,
		} );
	} catch ( error ) {
		throw toTransportError( error );
	}
}
