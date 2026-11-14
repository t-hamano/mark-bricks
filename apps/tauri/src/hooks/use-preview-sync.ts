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
import { invoke } from '@tauri-apps/api/core';
import { emitTo, listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { EditorHandle } from '@mark-bricks/editor';
import { getLocale } from '@mark-bricks/editor';
import { isMarpDocument } from '@mark-bricks/editor/marp';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import {
	PREVIEW_COMMAND_EVENT,
	PREVIEW_EVENT,
	PREVIEW_WINDOW,
	PREVIEW_WINDOW_CLOSED_EVENT,
	type PreviewCommand,
	type PreviewEvent,
	type PreviewPlacement,
} from '../preview/constants';
import {
	setSlidePreviewPlacement,
	setSlidePreviewShown,
} from '../preview/visibility';
import type { Tab } from '../store';

function isLine( line: unknown ): line is number {
	return Number.isInteger( line ) && ( line as number ) >= 0;
}

export type PreviewSync = {
	// The frame of the slide preview, when it is shown next to the editor.
	frameRef: RefObject< HTMLIFrameElement | null >;
	// Callback for the editor's `onSelectedLineChange`.
	onSelectedLineChange: ( line: number | null ) => void;
	// Whether the frame fills the window in full screen.
	isSlideMode: boolean;
};

/**
 * Keeps the slide preview showing the active document, in the frame next to
 * the editor or in a window of its own: renders it each time it changes, and
 * when the preview loads. Links the slides to the editor too: the preview
 * highlights the element of the selected block and moves to its slide, and a
 * click on an element selects its block. Opens and closes the window with the
 * preview, and turns the preview off when the user closes its window. Handles
 * the slide mode of the frame, which fills the window in full screen.
 *
 * @param activeTab The active tab, if any.
 * @param editorRef The editor of the active tab.
 * @param isShown   Whether the preview is on.
 * @param placement Where the preview is shown.
 * @return The frame's ref, the editor's callback, and the slide mode.
 */
export default function usePreviewSync(
	activeTab: Tab | undefined,
	editorRef: RefObject< EditorHandle | null >,
	isShown: boolean,
	placement: PreviewPlacement
): PreviewSync {
	const markdown = activeTab?.content ?? '';
	const documentPath = activeTab?.filePath;
	const isMarp = isMarpDocument( markdown );
	const isWindow = isShown && placement === 'window';

	const frameRef = useRef< HTMLIFrameElement >( null );
	const documentRef = useRef( { markdown, documentPath, isMarp } );
	documentRef.current = { markdown, documentPath, isMarp };
	const isWindowRef = useRef( isWindow );
	isWindowRef.current = isWindow;
	const selectedLineRef = useRef< number | null >( null );
	const [ isSlideMode, setIsSlideMode ] = useState( false );
	const isSlideModeRef = useRef( isSlideMode );
	isSlideModeRef.current = isSlideMode;
	// Whether the slide mode put the window in full screen, which it then
	// leaves with it.
	const enteredFullscreenRef = useRef( false );

	const send = useCallback( ( command: PreviewCommand ) => {
		if ( isWindowRef.current ) {
			void emitTo( PREVIEW_WINDOW, PREVIEW_COMMAND_EVENT, command );
		} else {
			frameRef.current?.contentWindow?.postMessage(
				command,
				location.origin
			);
		}
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
			if ( ! current.isMarp ) {
				// The window stays open across the tabs, and tells what it
				// cannot show. The frame leaves with the deck.
				if ( isWindowRef.current ) {
					send( {
						type: 'slides',
						slides: {
							notice: __( 'Not a Marp document', 'mark-bricks' ),
						},
					} );
				}
				return;
			}
			if ( ! isWindowRef.current && ! frameRef.current ) {
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
	useEffect( () => {
		const unlisten = getCurrentWindow().onResized( async () => {
			if (
				isSlideModeRef.current &&
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

	const handleEvent = useCallback(
		( data: PreviewEvent ) => {
			switch ( data.type ) {
				case 'ready':
					// A new frame, such as one of another tab, starts outside
					// the slide mode, so the window leaves it too.
					if ( isSlideModeRef.current ) {
						void setSlideMode( false );
					}
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
				case 'placement-request':
					if (
						data.placement === 'panel' ||
						data.placement === 'window'
					) {
						setSlidePreviewPlacement( data.placement );
					}
					break;
			}
		},
		[ editorRef, scheduleRender, send, setSlideMode ]
	);

	// Events from the frame next to the editor.
	useEffect( () => {
		function onMessage( event: MessageEvent ) {
			if (
				frameRef.current &&
				event.source === frameRef.current.contentWindow &&
				event.origin === location.origin
			) {
				handleEvent( event.data as PreviewEvent );
			}
		}
		window.addEventListener( 'message', onMessage );
		return () => window.removeEventListener( 'message', onMessage );
	}, [ handleEvent ] );

	// Events from the preview window.
	useEffect( () => {
		const unlisten = listen< PreviewEvent >(
			PREVIEW_EVENT,
			( { payload } ) => {
				if ( isWindowRef.current ) {
					handleEvent( payload );
				}
			}
		);
		return () => {
			void unlisten.then( ( fn ) => fn() );
		};
	}, [ handleEvent ] );

	// Opens the window while the preview is on there, and closes it when the
	// preview is off or moves next to the editor. Each call waits for the one
	// before, and follows the latest state, so that a close never runs ahead
	// of an open that would then leave a window behind.
	const windowQueueRef = useRef< Promise< unknown > >( Promise.resolve() );
	useEffect( () => {
		windowQueueRef.current = windowQueueRef.current
			.then( () =>
				isWindowRef.current
					? invoke( 'open_preview', {
							title: __( 'Slide Preview', 'mark-bricks' ),
							locale: getLocale(),
						} )
					: invoke( 'close_preview' )
			)
			.catch( () => {} );
	}, [ isWindow ] );

	// Closing the window turns the preview off, rather than moving it next to
	// the editor. The window that the app closes itself, when the preview is
	// already off or moves, changes nothing.
	useEffect( () => {
		const unlisten = listen( PREVIEW_WINDOW_CLOSED_EVENT, () => {
			if ( isWindowRef.current ) {
				setSlidePreviewShown( false );
			}
		} );
		return () => {
			void unlisten.then( ( fn ) => fn() );
		};
	}, [] );

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

	// The frame leaves with the deck, such as when the user switches to a tab
	// that is not one, so the slide mode does too.
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
