/**
 * External dependencies
 */
import MonacoEditor, { type Monaco, type OnMount } from '@monaco-editor/react';
import type { editor as monacoEditor } from 'monaco-editor';
import { useEffect, useMemo, useRef } from 'react';

/**
 * WordPress dependencies
 */
import { Stack } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import {
	insertNewlineContinueMarkup,
	deleteMarkupBackward,
} from './markdown-commands';
import { BUILTIN_THEMES, type CodeEditorTheme } from './themes';
import './style.scss';

export type CodeEditorSettings = {
	theme: CodeEditorTheme;
	fontSize: number;
	tabSize: number;
	showLineNumbers: boolean;
};

const DEFAULT_CODE_EDITOR_SETTINGS: CodeEditorSettings = {
	theme: 'vs',
	fontSize: 14,
	tabSize: 4,
	showLineNumbers: true,
};

type Props = {
	content: string;
	onChange: ( content: string ) => void;
	settings?: Partial< CodeEditorSettings >;
};

export function TextEditor( { content, onChange, settings }: Props ) {
	const { theme, fontSize, tabSize, showLineNumbers } = {
		...DEFAULT_CODE_EDITOR_SETTINGS,
		...settings,
	};

	const monacoRef = useRef< Monaco | null >( null );
	const editorRef = useRef< monacoEditor.IStandaloneCodeEditor | null >(
		null
	);

	// Intercepts Enter/Backspace to drive Markdown list/quote auto-continuation,
	// since Monaco has no built-in support for it.
	const handleMount: OnMount = ( editor, monaco ) => {
		monacoRef.current = monaco;
		editorRef.current = editor;
		monaco.editor.setTheme( theme in BUILTIN_THEMES ? theme : 'vs' );
		editor.getModel()?.updateOptions( { tabSize, insertSpaces: true } );

		editor.onKeyDown( ( e ) => {
			if (
				e.keyCode === monaco.KeyCode.Enter &&
				! e.shiftKey &&
				! e.altKey &&
				! e.ctrlKey &&
				! e.metaKey
			) {
				if ( insertNewlineContinueMarkup( editor ) ) {
					e.preventDefault();
					e.stopPropagation();
				}
				return;
			}

			if (
				e.keyCode === monaco.KeyCode.Backspace &&
				! e.shiftKey &&
				! e.altKey &&
				! e.ctrlKey &&
				! e.metaKey
			) {
				if ( deleteMarkupBackward( editor ) ) {
					e.preventDefault();
					e.stopPropagation();
				}
			}
		} );
	};

	useEffect( () => {
		if ( monacoRef.current ) {
			monacoRef.current.editor.setTheme(
				theme in BUILTIN_THEMES ? theme : 'vs'
			);
		}
	}, [ theme ] );

	useEffect( () => {
		editorRef.current
			?.getModel()
			?.updateOptions( { tabSize, insertSpaces: true } );
	}, [ tabSize ] );

	const options =
		useMemo< monacoEditor.IStandaloneEditorConstructionOptions >(
			() => ( {
				wordWrap: 'on',
				lineNumbers: showLineNumbers ? 'on' : 'off',
				fontSize,
				minimap: { enabled: false },
				scrollBeyondLastLine: false,
				automaticLayout: true,
				padding: { top: 12, bottom: 12 },
			} ),
			[ showLineNumbers, fontSize ]
		);

	return (
		<Stack className="text-editor" direction="column" gap="lg">
			<MonacoEditor
				className="text-editor__monaco"
				value={ content }
				onChange={ ( next ) => {
					const value = next ?? '';
					if ( value === content ) {
						return;
					}
					onChange( value );
				} }
				onMount={ handleMount }
				language="markdown"
				options={ options }
			/>
		</Stack>
	);
}
