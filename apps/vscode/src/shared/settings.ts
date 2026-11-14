/**
 * External dependencies
 */
import type { FontFamily } from '@mark-bricks/editor/font-families';

/**
 * Visual editor appearance. `auto` follows the VS Code color theme.
 */
export type ThemeSetting = 'auto' | 'light' | 'dark';

export const THEME_SETTINGS: readonly ThemeSetting[] = [
	'auto',
	'light',
	'dark',
];

/**
 * The `markBricks.*` configuration, keyed without the section prefix. Mirrors
 * `contributes.configuration` in `package.json`, including its defaults.
 */
export type Settings = {
	showListViewByDefault: boolean;
	showBlockBreadcrumbs: boolean;
	topToolbar: boolean;
	spotlightMode: boolean;
	contentWidth: number;
	fontSize: number;
	fontFamily: FontFamily;
	theme: ThemeSetting;
};

export const DEFAULT_SETTINGS: Settings = {
	showListViewByDefault: false,
	showBlockBreadcrumbs: true,
	topToolbar: false,
	spotlightMode: false,
	contentWidth: 700,
	fontSize: 13,
	fontFamily: 'system',
	theme: 'auto',
};

/**
 * Settings the webview can change itself, from its header menu.
 */
export const WRITABLE_SETTING_KEYS = [ 'topToolbar', 'spotlightMode' ] as const;

export type WritableSettingKey = ( typeof WRITABLE_SETTING_KEYS )[ number ];

/**
 * Whether a value from the webview names a setting it may change. Messages
 * cross a process boundary, so their types are only a promise.
 *
 * @param key The key the webview sent.
 */
export function isWritableSettingKey(
	key: unknown
): key is WritableSettingKey {
	return ( WRITABLE_SETTING_KEYS as readonly unknown[] ).includes( key );
}
