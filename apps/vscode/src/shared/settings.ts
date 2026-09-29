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
export type WritableSettingKey = 'topToolbar' | 'spotlightMode';
