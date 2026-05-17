/**
 * External dependencies
 */
import { LazyStore } from '@tauri-apps/plugin-store';

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
	STORE_FILE,
	STORE_KEY,
} from './constants';

type Scopes = Record< string, Record< string, unknown > >;
type PersistedShape = { version: number } & Scopes;

const tauriStore = new LazyStore( STORE_FILE );

function migrate( version: number | undefined, scopes: Scopes ): Scopes {
	// Future migrations dispatch on `version` and rewrite `scopes`.
	void version;
	return scopes;
}

export async function getInitialLanguage(): Promise< unknown > {
	const raw = await tauriStore.get< PersistedShape >( STORE_KEY );
	return raw?.[ 'mark-bricks' ]?.language;
}

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
