/**
 * External dependencies
 */
import { createRoot } from 'react-dom/client';

/**
 * WordPress dependencies
 */
import { ThemeProvider } from '@wordpress/theme';
import { Button } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import type { PreviewLabels } from './constants';

const HINT_DURATION = 3000;
const VISIBLE_CLASS = 'is-visible';

// Seeds the theme with the window's background, so that the controls and the
// notice text stay legible on it.
const BACKGROUND_COLOR = '#3c3c3c';

export type FullscreenControls = {
	setLabels: ( labels: PreviewLabels ) => void;
	setFullscreen: ( fullscreen: boolean ) => void;
};

type Props = {
	labels: PreviewLabels | null;
	fullscreen: boolean;
	onToggle: () => void;
};

function Toolbar( { labels, fullscreen, onToggle }: Props ) {
	return (
		<ThemeProvider isRoot color={ { background: BACKGROUND_COLOR } }>
			{ labels && (
				<div className="preview-toolbar">
					<Button
						variant="outline"
						tone="neutral"
						onClick={ ( event ) => {
							onToggle();
							event.currentTarget.blur();
						} }
					>
						{ fullscreen
							? labels.exitFullscreen
							: labels.enterFullscreen }
					</Button>
				</div>
			) }
		</ThemeProvider>
	);
}

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
	const root = createRoot( toolbar );

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

	function renderToolbar() {
		root.render(
			<Toolbar
				labels={ labels }
				fullscreen={ fullscreen }
				onToggle={ toggle }
			/>
		);
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
			renderToolbar();
		},
		setFullscreen( value ) {
			fullscreen = value;
			renderToolbar();
			hideHint();
			if ( value ) {
				showHint();
			}
		},
	};
}
