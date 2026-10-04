/**
 * External dependencies
 */
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
	Editor,
	EditorThemeProvider,
	registerBlocks,
	registerFormats,
	type EditorHandle,
	type EditorTheme,
} from '@mark-bricks/editor';
import { editor as monacoEditor } from 'monaco-editor';

registerBlocks();
registerFormats();

// This document is an embedded playground. Tab should reach the surrounding
// page controls rather than insert indentation and trap keyboard navigation.
monacoEditor.onDidCreateEditor( ( editor ) => {
	editor.updateOptions( {
		tabFocusMode: true,
		ariaLabel: 'Markdown document',
	} );
} );

const sample = `# Project notes

This is a sample Markdown document. **Edit this text** as a block or use the Code editor button to edit the source.

## Tasks

- Review the requirements.
- Update the documentation.
- Run the tests.
`;

function Demo() {
	const [ theme, setTheme ] = useState< EditorTheme >( () =>
		window.matchMedia( '(prefers-color-scheme: dark)' ).matches
			? 'dark'
			: 'light'
	);
	const [ content, setContent ] = useState( sample );
	const [ mode, setMode ] = useState< 'visual' | 'text' >( 'visual' );
	const editorRef = useRef< EditorHandle >( null );

	useEffect( () => {
		const systemTheme = window.matchMedia( '(prefers-color-scheme: dark)' );
		let followsSystem = true;
		function followSystem( event: MediaQueryListEvent ) {
			if ( followsSystem ) {
				setTheme( event.matches ? 'dark' : 'light' );
			}
		}
		function receiveTheme( event: MessageEvent ) {
			if (
				event.origin !== window.location.origin ||
				event.source !== window.parent ||
				event.data?.type !== 'mark-bricks:theme' ||
				! [ 'light', 'dark' ].includes( event.data.theme )
			) {
				return;
			}
			followsSystem = false;
			setTheme( event.data.theme );
		}
		systemTheme.addEventListener( 'change', followSystem );
		window.addEventListener( 'message', receiveTheme );
		window.parent.postMessage(
			{ type: 'mark-bricks:demo-ready' },
			window.location.origin
		);
		return () => {
			systemTheme.removeEventListener( 'change', followSystem );
			window.removeEventListener( 'message', receiveTheme );
		};
	}, [] );

	useEffect( () => {
		document.documentElement.dataset.theme = theme;
	}, [ theme ] );

	useEffect( () => {
		function leaveCanvas( event: KeyboardEvent ) {
			const target = event.target;
			if (
				event.key !== 'Tab' ||
				event.shiftKey ||
				event.ctrlKey ||
				event.metaKey ||
				event.altKey ||
				event.isComposing ||
				! event.defaultPrevented ||
				! ( target instanceof HTMLElement ) ||
				! target.matches( '.block-editor-writing-flow__canvas-stop' ) ||
				target.ownerDocument.activeElement !== target
			) {
				return;
			}
			// Gutenberg consumes Tab at the canvas stop even when there is no
			// following control in this document. Continue in the host page.
			window.parent.postMessage(
				{ type: 'mark-bricks:demo-exit' },
				window.location.origin
			);
		}
		document.addEventListener( 'keydown', leaveCanvas );
		return () => document.removeEventListener( 'keydown', leaveCanvas );
	}, [] );

	function updateContent( next: string ) {
		setContent( next );
	}

	return (
		<EditorThemeProvider theme={ theme }>
			<Editor
				ref={ editorRef }
				content={ content }
				onChange={ updateContent }
				editorMode={ mode }
				onEditorModeChange={ ( next ) => {
					editorRef.current?.flush();
					setMode( next );
				} }
				settings={ {
					fixedToolbar: true,
					showBlockBreadcrumbs: false,
					spellCheck: true,
					codeEditor: {
						theme,
					},
				} }
				onRendered={ ( canvas ) => {
					const canvasDocument = canvas.ownerDocument;
					canvasDocument.documentElement.lang = 'en';
					canvasDocument.title = 'MarkBricks document canvas';
				} }
			/>
		</EditorThemeProvider>
	);
}

const root = document.getElementById( 'root' );
if ( root ) {
	createRoot( root ).render( <Demo /> );
}
