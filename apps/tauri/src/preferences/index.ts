/**
 * WordPress dependencies
 */
import { dispatch } from '@wordpress/data';
import { store as preferencesStore } from '@wordpress/preferences';

/**
 * Internal dependencies
 */
import {
	DEFAULT_PREFERENCES,
	PREFERENCES_VERSION,
	STORE_KEY,
} from './constants';
import { type PersistedShape, tauriStore } from './initial-language';
import { migrate, type Scopes } from './migration';

export async function setupPreferences() {
	const raw = await tauriStore.get< PersistedShape >( STORE_KEY );
	let initialScopes: Scopes = {};
	if ( raw ) {
		const { version, ...scopes } = raw;
		initialScopes = migrate( version, scopes );
	}

	for ( const [ scope, defaults ] of Object.entries( DEFAULT_PREFERENCES ) ) {
		dispatch( preferencesStore ).setDefaults( scope, defaults );
	}

	await dispatch( preferencesStore ).setPersistenceLayer( {
		async get() {
			return initialScopes;
		},
		async set( value: object ) {
			await tauriStore.set( STORE_KEY, {
				version: PREFERENCES_VERSION,
				...value,
			} );
			await tauriStore.save();
		},
	} );
}
