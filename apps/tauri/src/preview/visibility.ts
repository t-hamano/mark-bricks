/**
 * External dependencies
 */
import { useSyncExternalStore } from 'react';
import type { PreviewPlacement } from '@mark-bricks/marp-preview/controls';

// Whether the slide preview is on, and where. They last only while the app
// runs: each launch starts with the preview off, next to the editor.
let isShown = false;
let placement: PreviewPlacement = 'panel';
const listeners = new Set< () => void >();

function subscribe( listener: () => void ) {
	listeners.add( listener );
	return () => {
		listeners.delete( listener );
	};
}

function getIsShown() {
	return isShown;
}

function getPlacement() {
	return placement;
}

function notify() {
	for ( const listener of listeners ) {
		listener();
	}
}

/**
 * Turns the slide preview on or off.
 *
 * @param value Whether to show the preview.
 */
export function setSlidePreviewShown( value: boolean ) {
	if ( value === isShown ) {
		return;
	}
	isShown = value;
	notify();
}

/**
 * Moves the slide preview next to the editor, or into a window of its own.
 *
 * @param value Where to show the preview.
 */
export function setSlidePreviewPlacement( value: PreviewPlacement ) {
	if ( value === placement ) {
		return;
	}
	placement = value;
	notify();
}

/**
 * @return Whether the slide preview is on.
 */
export function useSlidePreviewShown(): boolean {
	return useSyncExternalStore( subscribe, getIsShown );
}

/**
 * @return Where the slide preview is shown.
 */
export function useSlidePreviewPlacement(): PreviewPlacement {
	return useSyncExternalStore( subscribe, getPlacement );
}
