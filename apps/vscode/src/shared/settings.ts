export const FONT_FAMILIES = [
	'system',
	'sans-serif',
	'serif',
	'monospace',
	'handwriting',
] as const;

export type FontFamily = ( typeof FONT_FAMILIES )[ number ];

/**
 * The `markBricks.*` configuration, keyed without the section prefix. Mirrors
 * `contributes.configuration` in `package.json`, including its defaults.
 */
export type Settings = {
	spellCheck: boolean;
	showListViewByDefault: boolean;
	showBlockBreadcrumbs: boolean;
	fixedToolbar: boolean;
	focusMode: boolean;
	contentWidth: number;
	fontSize: number;
	fontFamily: FontFamily;
};

export const DEFAULT_SETTINGS: Settings = {
	spellCheck: false,
	showListViewByDefault: false,
	showBlockBreadcrumbs: true,
	fixedToolbar: false,
	focusMode: false,
	contentWidth: 700,
	fontSize: 13,
	fontFamily: 'system',
};

/**
 * Settings the webview can change itself, from its header menu.
 */
export type WritableSettingKey = 'fixedToolbar' | 'focusMode';
