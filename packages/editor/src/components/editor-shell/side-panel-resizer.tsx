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
import { __ } from '@wordpress/i18n';

export const DEFAULT_SIDE_PANEL_SIZE = 50;
const MIN_SIZE = 10;
const MAX_SIZE = 90;
const KEYBOARD_STEP = 5;
const RESIZING_CLASS = 'is-resizing-side-panel';

export function clampSidePanelSize( size: number ): number {
	return Math.min( MAX_SIZE, Math.max( MIN_SIZE, size ) );
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
	const isDraggingRef = useRef( false );

	// A bar that goes away mid-drag, such as when the viewport narrows,
	// handles no more pointer events, so it gives the frames the pointer back.
	useEffect(
		() => () => {
			if ( isDraggingRef.current ) {
				document.body.classList.remove( RESIZING_CLASS );
			}
		},
		[]
	);

	function isRtl() {
		const element = sidePanelRef.current;
		return !! element && getComputedStyle( element ).direction === 'rtl';
	}

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
		const panelWidth = isRtl()
			? clientX - sidePanel.left
			: sidePanel.right - clientX;
		return clampSidePanelSize( ( panelWidth / width ) * 100 );
	}

	function onPointerDown( event: PointerEvent< HTMLDivElement > ) {
		if ( event.button !== 0 ) {
			return;
		}
		event.preventDefault();
		event.currentTarget.setPointerCapture( event.pointerId );
		isDraggingRef.current = true;
		// Keeps frames, such as the canvas and the side panel's content, from
		// taking the pointer while the bar moves over them.
		document.body.classList.add( RESIZING_CLASS );
	}

	function onPointerMove( event: PointerEvent< HTMLDivElement > ) {
		if ( ! isDraggingRef.current ) {
			return;
		}
		const next = sizeAt( event.clientX );
		if ( next !== null ) {
			onChange( next );
		}
	}

	function onPointerEnd( event: PointerEvent< HTMLDivElement > ) {
		if ( ! isDraggingRef.current ) {
			return;
		}
		isDraggingRef.current = false;
		document.body.classList.remove( RESIZING_CLASS );
		if ( event.currentTarget.hasPointerCapture( event.pointerId ) ) {
			event.currentTarget.releasePointerCapture( event.pointerId );
		}
	}

	function onKeyDown( event: KeyboardEvent< HTMLDivElement > ) {
		// The bar moves the way of the arrow, so the side panel, which is on
		// the inline end, grows toward the inline start.
		const towardStart = isRtl() ? 'ArrowRight' : 'ArrowLeft';
		const towardEnd = isRtl() ? 'ArrowLeft' : 'ArrowRight';
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
			aria-valuemin={ 100 - MAX_SIZE }
			aria-valuemax={ 100 - MIN_SIZE }
			tabIndex={ 0 }
			onPointerDown={ onPointerDown }
			onPointerMove={ onPointerMove }
			onPointerUp={ onPointerEnd }
			onPointerCancel={ onPointerEnd }
			onLostPointerCapture={ onPointerEnd }
			onKeyDown={ onKeyDown }
		/>
	);
}
