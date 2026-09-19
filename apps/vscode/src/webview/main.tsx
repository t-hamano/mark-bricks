/**
 * External dependencies
 */
import {
	BlockEditor,
	type EditorHandle,
} from '@mark-bricks/editor/block-editor';
import { applyLocale } from '@mark-bricks/editor/i18n';
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
		<BlockEditor
			ref={ editorRef }
			content={ content }
			onChange={ ( text ) => {
				setContent( text );
				post( { type: 'change', text } );
			} }
			settings={ { showUndoRedo: false } }
		/>
	);
}

async function bootstrap() {
	applyLocale( undefined );

	const [ { registerBlocks }, { registerFormats } ] = await Promise.all( [
		import( '@mark-bricks/editor/block-library' ),
		import( '@mark-bricks/editor/format-library' ),
	] );
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
}

void bootstrap();
