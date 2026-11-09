/**
 * External dependencies
 */
import {
	useEffect,
	useRef,
	type KeyboardEvent,
	type PointerEvent,
	type RefObject,
} from 'react';

/**
 * WordPress dependencies
 */
import { __, isRTL } from '@wordpress/i18n';

export const DEFAULT_SIDE_PANEL_SIZE = 50;
// The content's share of the width, in percent, that the bar keeps between.
const MIN_SIZE = 30;
const MAX_SIZE = 90;
const KEYBOARD_STEP = 5;
const OVERLAY_CLASS = 'editor-shell__side-panel-resize-overlay';

export function clampSidePanelSize( size: number ): number {
	return Math.min( 100 - MIN_SIZE, Math.max( 100 - MAX_SIZE, size ) );
}

type Props = {
	// The content and the side panel, which share the width.
	contentRef: RefObject< HTMLElement | null >;
	sidePanelRef: RefObject< HTMLElement | null >;
	// The side panel's share of the width, in percent.
	size: number;
	onChange: ( size: number ) => void;
};

/**
 * The bar between the content and the side panel, which the user drags, or
 * moves with the arrow keys, to share the width between them.
 *
 * @param props              Component props.
 * @param props.contentRef   The content.
 * @param props.sidePanelRef The side panel.
 * @param props.size         The side panel's share of the width, in percent.
 * @param props.onChange     Called with the share the user moves the bar to.
 */
export function SidePanelResizer( {
	contentRef,
	sidePanelRef,
	size,
	onChange,
}: Props ) {
	// Ends the drag in progress, if any.
	const endDragRef = useRef< ( () => void ) | null >( null );

	// A bar that goes away mid-drag, such as when the viewport narrows, ends
	// the drag, so that its overlay does not stay over the page.
	useEffect( () => () => endDragRef.current?.(), [] );

	function sizeAt( clientX: number ): number | null {
		const content = contentRef.current?.getBoundingClientRect();
		const sidePanel = sidePanelRef.current?.getBoundingClientRect();
		if ( ! content || ! sidePanel ) {
			return null;
		}
		const width = content.width + sidePanel.width;
		if ( width <= 0 ) {
			return null;
		}
		const panelWidth = isRTL()
			? clientX - sidePanel.left
			: sidePanel.right - clientX;
		return clampSidePanelSize( ( panelWidth / width ) * 100 );
	}

	function onPointerDown( event: PointerEvent< HTMLDivElement > ) {
		if ( event.button !== 0 ) {
			return;
		}
		event.preventDefault();
		endDragRef.current?.();
		// Covers the page while the bar moves, so that frames, such as the
		// canvas and the side panel's content, do not take the pointer. The
		// frames themselves stay as they are: turning their pointer events off
		// and on, or capturing the pointer, can leave WebKit sending the wheel
		// nowhere until the user clicks inside a frame.
		const overlay = document.createElement( 'div' );
		overlay.className = OVERLAY_CLASS;
		document.body.appendChild( overlay );

		function onMove( moveEvent: globalThis.PointerEvent ) {
			const next = sizeAt( moveEvent.clientX );
			if ( next !== null ) {
				onChange( next );
			}
		}
		function endDrag() {
			overlay.remove();
			window.removeEventListener( 'pointermove', onMove );
			window.removeEventListener( 'pointerup', endDrag );
			window.removeEventListener( 'pointercancel', endDrag );
			endDragRef.current = null;
		}
		window.addEventListener( 'pointermove', onMove );
		window.addEventListener( 'pointerup', endDrag );
		window.addEventListener( 'pointercancel', endDrag );
		endDragRef.current = endDrag;
	}

	function onKeyDown( event: KeyboardEvent< HTMLDivElement > ) {
		// The bar moves the way of the arrow, so the side panel, which is on
		// the inline end, grows toward the inline start.
		const towardStart = isRTL() ? 'ArrowRight' : 'ArrowLeft';
		const towardEnd = isRTL() ? 'ArrowLeft' : 'ArrowRight';
		let delta = 0;
		if ( event.key === towardStart ) {
			delta = KEYBOARD_STEP;
		} else if ( event.key === towardEnd ) {
			delta = -KEYBOARD_STEP;
		} else {
			return;
		}
		event.preventDefault();
		onChange( clampSidePanelSize( size + delta ) );
	}

	return (
		// The ARIA pattern of a window splitter: a focusable separator.
		// eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
		<div
			className="editor-shell__side-panel-resizer"
			role="separator"
			aria-orientation="vertical"
			aria-label={ __( 'Resize side panel', 'mark-bricks' ) }
			aria-valuenow={ Math.round( 100 - size ) }
			aria-valuemin={ MIN_SIZE }
			aria-valuemax={ MAX_SIZE }
			tabIndex={ 0 }
			onPointerDown={ onPointerDown }
			onKeyDown={ onKeyDown }
		/>
	);
}
