/**
 * External dependencies
 */
import type { CodeEditorSettings, EditorStyles } from '@mark-bricks/editor';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

export const STORE_FILE = 'preferences.json';
export const STORE_KEY = 'root';
export const PREFERENCES_VERSION = 1;

const DEFAULT_EDITOR_STYLES = {
	contentWidth: 700,
	fontSize: 13,
	fontFamily: '',
} satisfies EditorStyles;

const DEFAULT_CODE_EDITOR: CodeEditorSettings = {
	theme: 'vs',
	fontSize: 14,
	tabSize: 4,
	showLineNumbers: true,
};

export const DEFAULT_PREFERENCES = {
	core: {
		fixedToolbar: false,
		focusMode: false,
		showListViewByDefault: false,
		showBlockBreadcrumbs: true,
	},
	'mark-bricks': {
		language: '',
		checkUpdatesAuto: true,
		spellCheck: false,
		editorStyles: DEFAULT_EDITOR_STYLES,
		codeEditor: DEFAULT_CODE_EDITOR,
	},
};

export const getThemeOptions = (): { value: string; label: string }[] => [
	{ value: 'vs', label: __( 'Light', 'mark-bricks' ) },
	{ value: 'vs-dark', label: __( 'Dark', 'mark-bricks' ) },
	{
		value: 'hc-light',
		label: __( 'High Contrast Light', 'mark-bricks' ),
	},
	{
		value: 'hc-black',
		label: __( 'High Contrast Dark', 'mark-bricks' ),
	},
];

export const getFontFamilyOptions = (): { value: string; label: string }[] => [
	{ value: '', label: __( 'System Default', 'mark-bricks' ) },
	{
		value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', Arial, sans-serif",
		label: __( 'Sans-serif', 'mark-bricks' ),
	},
	{
		value: "Georgia, Cambria, 'Times New Roman', Times, serif",
		label: __( 'Serif', 'mark-bricks' ),
	},
	{
		value: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, 'Liberation Mono', 'Courier New', monospace",
		label: __( 'Monospace', 'mark-bricks' ),
	},
	{
		value: "'Comic Sans MS', 'Comic Sans', 'Chalkboard SE', 'Marker Felt', cursive",
		label: __( 'Handwriting', 'mark-bricks' ),
	},
];
