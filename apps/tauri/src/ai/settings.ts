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
import { AiError } from './error';
import type { AiModel } from './provider';
import { PROVIDERS, type AiProvider } from './providers';
import { toTransportError } from './transport';

export type { AiModel };

/**
 * Whether an API key is saved for the provider.
 *
 * @param provider The provider.
 */
export function hasApiKey( provider: AiProvider ): Promise< boolean > {
	return invoke< boolean >( 'has_ai_api_key', { provider } );
}

/**
 * Checks that the provider's API accepts the key, before it is saved.
 * Rejects with an error whose message is written for the user.
 *
 * @param provider The provider.
 * @param key      The API key.
 */
export async function checkApiKey(
	provider: AiProvider,
	key: string
): Promise< void > {
	try {
		await invoke( 'check_ai_api_key', { provider, key } );
	} catch ( error ) {
		const transportError = toTransportError( error, provider );
		if (
			transportError instanceof AiError &&
			transportError.errorType === 'authentication_error'
		) {
			throw new AiError(
				__( 'This API key is not valid.', 'mark-bricks' ),
				transportError.errorType
			);
		}
		throw transportError;
	}
}

/**
 * Saves the provider's API key in the OS credential store, replacing the
 * one saved before.
 *
 * @param provider The provider.
 * @param key      The API key.
 */
export function saveApiKey(
	provider: AiProvider,
	key: string
): Promise< void > {
	return invoke( 'save_ai_api_key', { provider, key } );
}

/**
 * Deletes the provider's saved API key.
 *
 * @param provider The provider.
 */
export function deleteApiKey( provider: AiProvider ): Promise< void > {
	return invoke( 'delete_ai_api_key', { provider } );
}

/**
 * Lists the models the provider's saved API key can use, newest first.
 * Rejects with an error whose message is written for the user.
 *
 * @param provider The provider.
 */
export async function listModels( provider: AiProvider ): Promise< AiModel[] > {
	let models: AiModel[];
	try {
		models = await invoke< AiModel[] >( 'list_ai_models', { provider } );
	} catch ( error ) {
		throw toTransportError( error, provider );
	}
	const { filterModels } = PROVIDERS[ provider ];
	return filterModels ? filterModels( models ) : models;
}
