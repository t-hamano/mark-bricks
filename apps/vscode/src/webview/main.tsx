/**
 * External dependencies
 */
import type { Platform } from '@mark-bricks/editor';
import {
	BlockEditor,
	type EditorHandle,
} from '@mark-bricks/editor/block-editor';
import { EditorThemeProvider } from '@mark-bricks/editor/editor-theme-provider';
import { applyLocale } from '@mark-bricks/editor/i18n';
import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * WordPress dependencies
 */
import { useEnableWpCompatOverlaySlot } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import type { HostMessage, WebviewMessage } from '../shared/messages';
import HeaderActions from './header-actions';
import { applyVsCodeLocale } from './i18n';
import { useVsCodeTheme } from './use-vscode-theme';
import './style.scss';

const host = acquireVsCodeApi();

function post( message: WebviewMessage ): void {
	host.postMessage( message );
}

const pendingImageRequests = new Map< number, ( src: string ) => void >();
let imageRequestSeq = 0;

// Local image paths only make sense to the extension host, which knows the
// document location and can turn them into webview resource URIs.
const platform: Partial< Platform > = {
	resolveImageSrc( path ) {
		const requestId = ++imageRequestSeq;
		return new Promise( ( resolve ) => {
			pendingImageRequests.set( requestId, resolve );
			post( { type: 'resolveImage', requestId, path } );
		} );
	},
};

function App() {
	// Portals @wordpress/ui overlays into a body-level slot that stacks above
	// @wordpress/components overlays. Required while both libraries coexist.
	useEnableWpCompatOverlaySlot();

	const [ content, setContent ] = useState< string | null >( null );
	const editorRef = useRef< EditorHandle >( null );
	const theme = useVsCodeTheme();

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
				case 'resolveImage:done':
					pendingImageRequests.get( message.requestId )?.(
						message.src
					);
					pendingImageRequests.delete( message.requestId );
					break;
			}
		}

		window.addEventListener( 'message', onMessage );
		post( { type: 'ready' } );
		return () => window.removeEventListener( 'message', onMessage );
	}, [] );

	// The editor debounces onChange, and the host can't ask for a flush once
	// the panel is being disposed. Drain it whenever the webview loses focus
	// or is hidden, which precedes closing the tab or reopening it with
	// another editor, and on shortcuts such as Ctrl+W that close it while
	// focused.
	useEffect( () => {
		function flush() {
			editorRef.current?.flush();
		}
		function onVisibilityChange() {
			if ( document.visibilityState === 'hidden' ) {
				flush();
			}
		}
		function onKeyDown( event: KeyboardEvent ) {
			if ( event.ctrlKey || event.metaKey ) {
				flush();
			}
		}

		window.addEventListener( 'blur', flush );
		window.addEventListener( 'pagehide', flush );
		window.addEventListener( 'keydown', onKeyDown, true );
		document.addEventListener( 'visibilitychange', onVisibilityChange );
		return () => {
			window.removeEventListener( 'blur', flush );
			window.removeEventListener( 'pagehide', flush );
			window.removeEventListener( 'keydown', onKeyDown, true );
			document.removeEventListener(
				'visibilitychange',
				onVisibilityChange
			);
		};
	}, [] );

	if ( content === null ) {
		return null;
	}

	return (
		<EditorThemeProvider theme={ theme }>
			<BlockEditor
				ref={ editorRef }
				content={ content }
				onChange={ ( text ) => {
					setContent( text );
					post( { type: 'change', text } );
				} }
				settings={ { showUndoRedo: false } }
				headerActions={ <HeaderActions /> }
				platform={ platform }
			/>
		</EditorThemeProvider>
	);
}

async function bootstrap() {
	// The extension host writes VS Code's display language into `<html lang>`.
	// Write the resolved locale back so it matches the language the UI is
	// actually rendered in (e.g. English for an unsupported display language).
	const locale = applyLocale( document.documentElement.lang );
	document.documentElement.lang = locale;
	applyVsCodeLocale( locale );

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
