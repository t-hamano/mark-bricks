/**
 * WordPress dependencies
 */
import { dispatch } from '@wordpress/data';
import { store as interfaceStore } from '@wordpress/interface';

export const PREFERENCES_MODAL_NAME = 'mark-bricks/preferences';

export type PreferencesTab = 'general' | 'visual-editor' | 'code-editor' | 'ai';

let initialTab: PreferencesTab = 'general';

/**
 * The tab the preferences show when they open.
 */
export function getInitialPreferencesTab() {
	return initialTab;
}

/**
 * Opens the preferences on a tab.
 *
 * @param tab The tab to show. Defaults to the general tab.
 */
export function openPreferences( tab: PreferencesTab = 'general' ) {
	initialTab = tab;
	dispatch( interfaceStore ).openModal( PREFERENCES_MODAL_NAME );
}
