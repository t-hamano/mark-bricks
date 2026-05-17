/**
 * WordPress dependencies
 */
// Outer document UI styles. Iframe (BlockCanvas) styles are handled
// separately via `?raw` imports in the Editor component.
import '@wordpress/theme/design-tokens.css';
import '@wordpress/components/build-style/style.css';
import '@wordpress/block-editor/build-style/style.css';

/**
 * Internal dependencies
 */
import { registerBlocks } from './block-library';
import { registerFormats } from './format-library';

registerBlocks();
registerFormats();

export { LOCALES, applyLocale, getLocale, type Locale } from './i18n';

export { Editor } from './components/editor';
export type { EditorStyles } from './components/editor';
export type { CodeEditorSettings } from './components/text-editor';
export type { Platform } from './platform';
export {
	useEditorShortcuts,
	type ShortcutKeyCombinationData,
	type ShortcutEntry,
} from './components/keyboard-shortcuts/hooks';
