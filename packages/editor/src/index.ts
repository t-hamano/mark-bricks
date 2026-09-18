export { LOCALES, applyLocale, getLocale, type Locale } from './i18n';
export { registerBlocks } from './block-library';
export { registerFormats } from './format-library';
export { Editor } from './components/editor';
export { BlockEditor } from './components/block-editor';
export { CodeEditor } from './components/code-editor';
export type { EditorHandle, EditorStyles } from './components/editor';
export type { CodeEditorSettings } from './components/text-editor';
export type { Platform } from './platform';
export {
	useEditorShortcuts,
	useKeyboardShortcut,
	type ShortcutKeyCombinationData,
	type ShortcutEntry,
} from './components/keyboard-shortcuts/hooks';
