/**
 * External dependencies
 */
import { LazyStore } from '@tauri-apps/plugin-store';

/**
 * Internal dependencies
 */
import { STORE_FILE, STORE_KEY } from './constants';
import type { Scopes } from './migration';
import { toWpLocale } from '../i18n';

export type PersistedShape = { version: number } & Scopes;

// The store the preferences persist to. It lives here, apart from the
// preferences setup, so that reading the language before the editor starts
// does not load `@wordpress/preferences` ahead of the locale.
export const tauriStore = new LazyStore( STORE_FILE );

export async function getInitialLanguage(): Promise< string > {
	const raw = await tauriStore.get< PersistedShape >( STORE_KEY );
	const language = raw?.[ 'mark-bricks' ]?.language;
	return typeof language === 'string' && language
		? language
		: ( toWpLocale( navigator.language ) ?? 'en' );
}
