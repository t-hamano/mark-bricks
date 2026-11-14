/**
 * External dependencies
 */
import { createContext } from 'react';
import type { editor as MonacoEditor } from 'monaco-editor';

export type TextEditorContextValue = {
	/**
	 * The text editor's Monaco instance while the text editor is open, or
	 * `null` in the visual editor.
	 */
	editor: MonacoEditor.IStandaloneCodeEditor | null;
	/**
	 * Called by the text editor when it creates or disposes of its Monaco
	 * instance.
	 */
	setEditor: (
		update: (
			current: MonacoEditor.IStandaloneCodeEditor | null
		) => MonacoEditor.IStandaloneCodeEditor | null
	) => void;
};

/**
 * Holds the text editor's Monaco instance while the text editor is open, so
 * the AI assistant can read and edit it.
 */
export const TextEditorContext = createContext< TextEditorContextValue | null >(
	null
);
