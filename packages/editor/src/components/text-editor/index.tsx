/**
 * External dependencies
 */
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import { useEffect, useRef } from 'react';

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

// Monaco offloads heavy work to a web worker. Tell it to use the Vite-bundled
// worker so it loads locally instead of fetching from a CDN.
self.MonacoEnvironment = { getWorker: () => new EditorWorker() };

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

	const containerRef = useRef< HTMLDivElement >( null );
	const editorRef = useRef< monaco.editor.IStandaloneCodeEditor | null >(
		null
	);

	const contentRef = useRef( content );
	contentRef.current = content;

	const onChangeRef = useRef( onChange );
	onChangeRef.current = onChange;

	const initialSettingsRef = useRef( {
		theme,
		fontSize,
		tabSize,
		showLineNumbers,
	} );

	// Create the editor once; the effects below keep it in sync. Enter/Backspace
	// are intercepted for Markdown list/quote auto-continuation.
	useEffect( () => {
		const container = containerRef.current;
		if ( ! container ) {
			return;
		}

		const initialSettings = initialSettingsRef.current;
		const editor = monaco.editor.create( container, {
			value: contentRef.current,
			language: 'markdown',
			theme:
				initialSettings.theme in BUILTIN_THEMES
					? initialSettings.theme
					: DEFAULT_CODE_EDITOR_SETTINGS.theme,
			fontSize: initialSettings.fontSize,
			lineNumbers: initialSettings.showLineNumbers ? 'on' : 'off',
			wordWrap: 'on',
			minimap: { enabled: false },
			scrollBeyondLastLine: false,
			automaticLayout: true,
			padding: { top: 12, bottom: 12 },
		} );

		editor.getModel()?.updateOptions( {
			tabSize: initialSettings.tabSize,
			insertSpaces: true,
		} );
		editorRef.current = editor;

		const changeSubscription = editor.onDidChangeModelContent( () => {
			const value = editor.getValue();
			if ( value === contentRef.current ) {
				return;
			}
			onChangeRef.current( value );
		} );

		const keySubscription = editor.onKeyDown( ( e ) => {
			const hasModifier =
				e.shiftKey || e.altKey || e.ctrlKey || e.metaKey;
			if ( hasModifier ) {
				return;
			}
			if (
				e.keyCode === monaco.KeyCode.Enter &&
				insertNewlineContinueMarkup( editor )
			) {
				e.preventDefault();
				e.stopPropagation();
			} else if (
				e.keyCode === monaco.KeyCode.Backspace &&
				deleteMarkupBackward( editor )
			) {
				e.preventDefault();
				e.stopPropagation();
			}
		} );

		return () => {
			changeSubscription.dispose();
			keySubscription.dispose();
			editor.dispose();
			editorRef.current = null;
		};
	}, [] );

	// Reflect external `content` changes (e.g. switching tabs) into the model.
	useEffect( () => {
		const editor = editorRef.current;
		if ( editor && editor.getValue() !== content ) {
			editor.setValue( content );
		}
	}, [ content ] );

	// Apply theme changes.
	useEffect( () => {
		monaco.editor.setTheme(
			theme in BUILTIN_THEMES ? theme : DEFAULT_CODE_EDITOR_SETTINGS.theme
		);
	}, [ theme ] );

	// Sync editor-level options that can change after mount.
	useEffect( () => {
		editorRef.current?.updateOptions( {
			fontSize,
			lineNumbers: showLineNumbers ? 'on' : 'off',
		} );
	}, [ fontSize, showLineNumbers ] );

	// `tabSize`/`insertSpaces` are model options, not editor options.
	useEffect( () => {
		editorRef.current
			?.getModel()
			?.updateOptions( { tabSize, insertSpaces: true } );
	}, [ tabSize ] );

	return (
		<Stack className="text-editor" direction="column" gap="lg">
			<div ref={ containerRef } className="text-editor__monaco" />
		</Stack>
	);
}
