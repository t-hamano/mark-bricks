/**
 * External dependencies
 */
import { useSyncExternalStore } from 'react';

// Whether the slide preview is on. It lasts only while the app runs: each
// launch starts with the preview off.
let isShown = false;
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
	for ( const listener of listeners ) {
		listener();
	}
}

/**
 * @return Whether the slide preview is on.
 */
export function useSlidePreviewShown(): boolean {
	return useSyncExternalStore( subscribe, getIsShown );
}
