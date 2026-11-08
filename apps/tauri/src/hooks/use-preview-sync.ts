/**
 * External dependencies
 */
import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type RefObject,
} from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { EditorHandle } from '@mark-bricks/editor';
import { isMarpDocument } from '@mark-bricks/editor/marp';

/**
 * Internal dependencies
 */
import type { PreviewCommand, PreviewEvent } from '../preview/constants';
import type { Tab } from '../store';

function isLine( line: unknown ): line is number {
	return Number.isInteger( line ) && ( line as number ) >= 0;
}

export type PreviewSync = {
	// The frame of the slide preview, when it is shown.
	frameRef: RefObject< HTMLIFrameElement | null >;
	// Callback for the editor's `onSelectedLineChange`.
	onSelectedLineChange: ( line: number | null ) => void;
	// Whether the preview fills the window in full screen.
	isSlideMode: boolean;
};

/**
 * Keeps the slide preview frame showing the active document: renders it each
 * time it changes, and when the frame loads. Links the slides to the editor
 * too: the preview highlights the element of the selected block and moves to
 * its slide, and a click on an element selects its block. Handles the slide
 * mode, which fills the window in full screen with the preview.
 *
 * @param activeTab The active tab, if any.
 * @param editorRef The editor of the active tab.
 * @return The frame's ref, the editor's callback, and the slide mode.
 */
export default function usePreviewSync(
	activeTab: Tab | undefined,
	editorRef: RefObject< EditorHandle | null >
): PreviewSync {
	const markdown = activeTab?.content ?? '';
	const documentPath = activeTab?.filePath;
	const isMarp = isMarpDocument( markdown );

	const frameRef = useRef< HTMLIFrameElement >( null );
	const documentRef = useRef( { markdown, documentPath, isMarp } );
	documentRef.current = { markdown, documentPath, isMarp };
	const selectedLineRef = useRef< number | null >( null );
	const [ isSlideMode, setIsSlideMode ] = useState( false );
	// Whether the slide mode put the window in full screen, which it then
	// leaves with it.
	const enteredFullscreenRef = useRef( false );

	const send = useCallback( ( command: PreviewCommand ) => {
		frameRef.current?.contentWindow?.postMessage(
			command,
			location.origin
		);
	}, [] );

	// Renders the deck on the next frame, once however often it changes.
	const renderFrameRef = useRef< number | null >( null );
	const scheduleRender = useCallback( () => {
		if ( renderFrameRef.current !== null ) {
			return;
		}
		renderFrameRef.current = requestAnimationFrame( () => {
			renderFrameRef.current = null;
			const current = documentRef.current;
			if ( ! current.isMarp || ! frameRef.current ) {
				return;
			}
			void import( '../preview/render' ).then( ( { renderSlides } ) => {
				// A later render already holds the latest document.
				if (
					documentRef.current.markdown !== current.markdown ||
					documentRef.current.documentPath !== current.documentPath
				) {
					return;
				}
				send( {
					type: 'slides',
					slides: renderSlides(
						current.markdown,
						current.documentPath
					),
				} );
			} );
		} );
	}, [ send ] );

	useEffect(
		() => () => {
			if ( renderFrameRef.current !== null ) {
				cancelAnimationFrame( renderFrameRef.current );
				renderFrameRef.current = null;
			}
		},
		[]
	);

	const setSlideMode = useCallback(
		async ( enabled: boolean ) => {
			const appWindow = getCurrentWindow();
			setIsSlideMode( enabled );
			send( { type: 'slide-mode', enabled } );
			if ( enabled ) {
				// Moves the keyboard to the slides, for the keys to reach them.
				frameRef.current?.focus();
				if ( ! ( await appWindow.isFullscreen() ) ) {
					enteredFullscreenRef.current = true;
					await appWindow.setFullscreen( true );
				}
			} else if ( enteredFullscreenRef.current ) {
				enteredFullscreenRef.current = false;
				await appWindow.setFullscreen( false );
			}
		},
		[ send ]
	);

	// Full screen can also end without the `F` key, such as with the green
	// button on macOS.
	const isSlideModeRef = useRef( isSlideMode );
	isSlideModeRef.current = isSlideMode;
	useEffect( () => {
		const unlisten = getCurrentWindow().onResized( async () => {
			if (
				isSlideModeRef.current &&
				enteredFullscreenRef.current &&
				! ( await getCurrentWindow().isFullscreen() )
			) {
				enteredFullscreenRef.current = false;
				setIsSlideMode( false );
				send( { type: 'slide-mode', enabled: false } );
			}
		} );
		return () => {
			void unlisten.then( ( fn ) => fn() );
		};
	}, [ send ] );

	useEffect( () => {
		function onMessage( event: MessageEvent ) {
			if (
				! frameRef.current ||
				event.source !== frameRef.current.contentWindow ||
				event.origin !== location.origin
			) {
				return;
			}
			const data = event.data as PreviewEvent;
			switch ( data.type ) {
				case 'ready':
					scheduleRender();
					send( {
						type: 'selected-line',
						line: selectedLineRef.current,
					} );
					break;
				case 'line-click':
					if ( documentRef.current.isMarp && isLine( data.line ) ) {
						editorRef.current?.selectLine( data.line );
					}
					break;
				case 'slide-mode-request':
					void setSlideMode( !! data.enabled );
					break;
			}
		}
		window.addEventListener( 'message', onMessage );
		return () => window.removeEventListener( 'message', onMessage );
	}, [ editorRef, scheduleRender, send, setSlideMode ] );

	useEffect( () => {
		scheduleRender();
	}, [ markdown, documentPath, scheduleRender ] );

	// The editor of another tab starts with no block selected, and reports
	// nothing until one is.
	const tabId = activeTab?.id;
	useEffect( () => {
		if ( selectedLineRef.current !== null ) {
			selectedLineRef.current = null;
			send( { type: 'selected-line', line: null } );
		}
	}, [ tabId, send ] );

	// The preview leaves with the deck, such as when the user switches to a
	// tab that is not one, so the slide mode does too.
	useEffect( () => {
		if ( ! isMarp && isSlideModeRef.current ) {
			void setSlideMode( false );
		}
	}, [ isMarp, setSlideMode ] );

	const onSelectedLineChange = useCallback(
		( line: number | null ) => {
			selectedLineRef.current = line;
			send( { type: 'selected-line', line } );
		},
		[ send ]
	);

	return { frameRef, onSelectedLineChange, isSlideMode };
}
