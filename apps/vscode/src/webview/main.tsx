/**
 * External dependencies
 */
import {
	Editor,
	applyLocale,
	registerBlocks,
	registerFormats,
	type EditorHandle,
} from '@mark-bricks/editor';
import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * Internal dependencies
 */
import type { HostMessage, WebviewMessage } from '../shared/messages';
import './style.scss';

const host = acquireVsCodeApi();

function post( message: WebviewMessage ): void {
	host.postMessage( message );
}

function App() {
	// `null` until the host answers `ready`, so the editor is never mounted
	// against a document it would then have to reparse.
	const [ content, setContent ] = useState< string | null >( null );
	const editorRef = useRef< EditorHandle >( null );

	useEffect( () => {
		function onMessage( event: MessageEvent< HostMessage > ) {
			const message = event.data;
			switch ( message.type ) {
				case 'init':
				case 'update':
					setContent( message.text );
					break;

				case 'flush':
					// Drains the editor's debounce, which emits synchronously.
					// The `change` that produces is posted before the reply, so
					// the host has the text by the time the reply lands.
					editorRef.current?.flush();
					post( {
						type: 'flush:done',
						requestId: message.requestId,
					} );
					break;
			}
		}

		window.addEventListener( 'message', onMessage );
		post( { type: 'ready' } );
		return () => window.removeEventListener( 'message', onMessage );
	}, [] );

	if ( content === null ) {
		return null;
	}

	return (
		<Editor
			ref={ editorRef }
			content={ content }
			onChange={ ( text ) => post( { type: 'change', text } ) }
			editorMode="visual"
			settings={ {
				// Raw markdown is edited in VSCode's own text editor, so the
				// bundled source editor is neither shown nor built.
				enableCodeEditor: false,
				// Undo runs off the editor's internal history, which the
				// VSCode UI has no buttons for.
				showUndoRedo: false,
			} }
		/>
	);
}

// The registries and the locale have to be in place before the editor renders
// a single translated label. Same order as `apps/tauri/src/main.tsx`.
applyLocale( undefined );
registerBlocks();
registerFormats();

const container = document.getElementById( 'root' );

if ( container ) {
	createRoot( container ).render(
		<StrictMode>
			<App />
		</StrictMode>
	);
}
