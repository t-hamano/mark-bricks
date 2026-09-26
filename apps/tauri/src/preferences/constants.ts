/**
 * External dependencies
 */
import {
	FONT_FAMILY_STACKS,
	type CodeEditorSettings,
	type EditorStyles,
	type EditorThemePreference,
} from '@mark-bricks/editor';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

export const STORE_FILE = 'preferences.json';
export const STORE_KEY = 'root';
export const PREFERENCES_VERSION = 2;

const DEFAULT_EDITOR_STYLES = {
	contentWidth: 700,
	fontSize: 13,
	fontFamily: '',
} satisfies EditorStyles;

const DEFAULT_CODE_EDITOR: CodeEditorSettings = {
	theme: 'system',
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
		editorTheme: 'system' as EditorThemePreference,
		editorStyles: DEFAULT_EDITOR_STYLES,
		codeEditor: DEFAULT_CODE_EDITOR,
	},
};

export const getThemeOptions = (): { value: string; label: string }[] => [
	{ value: 'system', label: __( 'System Default', 'mark-bricks' ) },
	{ value: 'light', label: __( 'Light', 'mark-bricks' ) },
	{ value: 'dark', label: __( 'Dark', 'mark-bricks' ) },
];

export const getFontFamilyOptions = (): {
	value: string | null;
	label: string;
}[] => [
	{ value: null, label: __( 'System Default', 'mark-bricks' ) },
	{
		value: FONT_FAMILY_STACKS[ 'sans-serif' ],
		label: __( 'Sans-serif', 'mark-bricks' ),
	},
	{
		value: FONT_FAMILY_STACKS.serif,
		label: __( 'Serif', 'mark-bricks' ),
	},
	{
		value: FONT_FAMILY_STACKS.monospace,
		label: __( 'Monospace', 'mark-bricks' ),
	},
	{
		value: FONT_FAMILY_STACKS.handwriting,
		label: __( 'Handwriting', 'mark-bricks' ),
	},
];
