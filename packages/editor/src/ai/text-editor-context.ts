/**
 * External dependencies
 */
import { createContext, type RefObject } from 'react';
import type { editor as MonacoEditor } from 'monaco-editor';

/**
 * Holds the text editor's Monaco instance while the text editor is open, so
 * the AI assistant can read and edit it. `null` in the visual editor.
 */
export const TextEditorContext =
	createContext< RefObject< MonacoEditor.IStandaloneCodeEditor | null > | null >(
		null
	);
