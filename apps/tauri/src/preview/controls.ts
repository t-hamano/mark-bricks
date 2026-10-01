/**
 * Internal dependencies
 */
import type { PreviewLabels } from './constants';

const HINT_DURATION = 3000;
const VISIBLE_CLASS = 'is-visible';

export type FullscreenControls = {
	setLabels: ( labels: PreviewLabels ) => void;
	setFullscreen: ( fullscreen: boolean ) => void;
};

/**
 * Adds a toolbar with a button that toggles full screen, shown while the
 * pointer is over it, and a hint on how to leave full screen.
 *
 * @param toggle Toggles full screen.
 * @return Functions to update the controls with the labels and the full
 *         screen state.
 */
export function createFullscreenControls(
	toggle: () => void
): FullscreenControls {
	let labels: PreviewLabels | null = null;
	let fullscreen = false;
	let hintTimer: number | undefined;

	const toolbar = document.createElement( 'div' );
	toolbar.className = 'preview-toolbar';
	const button = document.createElement( 'button' );
	button.type = 'button';
	button.addEventListener( 'click', () => {
		toggle();
		// Keeps Enter and Space from pressing the button again.
		button.blur();
	} );
	toolbar.append( button );

	const hint = document.createElement( 'div' );
	hint.className = 'preview-hint';
	hint.setAttribute( 'role', 'status' );
	// Empties the hint once it fades out, so that showing it again changes its
	// text and screen readers announce it again.
	hint.addEventListener( 'transitionend', () => {
		if ( ! hint.classList.contains( VISIBLE_CLASS ) ) {
			hint.textContent = '';
		}
	} );

	// Placed before the slides, so that the button comes first in the focus
	// order, as it does on screen.
	document.body.prepend( hint, toolbar );

	function updateButton() {
		if ( ! labels ) {
			return;
		}
		button.textContent = fullscreen
			? labels.exitFullscreen
			: labels.enterFullscreen;
	}

	function hideHint() {
		window.clearTimeout( hintTimer );
		hint.classList.remove( VISIBLE_CLASS );
		// With reduced motion, the hint does not fade out, and no
		// `transitionend` follows.
		if ( getComputedStyle( hint ).transitionDuration === '0s' ) {
			hint.textContent = '';
		}
	}

	function showHint() {
		if ( ! labels ) {
			return;
		}
		hint.textContent = labels.exitFullscreenHint;
		hint.classList.add( VISIBLE_CLASS );
		hintTimer = window.setTimeout( hideHint, HINT_DURATION );
	}

	return {
		setLabels( value ) {
			labels = value;
			updateButton();
		},
		setFullscreen( value ) {
			fullscreen = value;
			updateButton();
			hideHint();
			if ( value ) {
				showHint();
			}
		},
	};
}
