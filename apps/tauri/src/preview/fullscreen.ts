/**
 * External dependencies
 */
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

/**
 * Internal dependencies
 */
import { clampSlideIndex, getSlideIndexForKey } from './navigation';

const FULLSCREEN_CLASS = 'is-fullscreen';
const CURRENT_SLIDE_CLASS = 'is-current';

/**
 * Finds the slide that takes up the most of the window's height.
 *
 * @param slides The slides, in order.
 * @return Index of the slide, or 0 when none is visible.
 */
function findMostVisibleSlide( slides: Element[] ): number {
	let mostVisible = 0;
	let mostVisibleHeight = 0;
	slides.forEach( ( slide, index ) => {
		const { top, bottom } = slide.getBoundingClientRect();
		const height =
			Math.min( bottom, window.innerHeight ) - Math.max( top, 0 );
		if ( height > mostVisibleHeight ) {
			mostVisible = index;
			mostVisibleHeight = height;
		}
	} );
	return mostVisible;
}

/**
 * Lets the `F` and F11 keys toggle full screen, and Escape leave it. Full
 * screen presents the slides one at a time, starting from the one most
 * visible in the scrolling view, and the arrow, Page Up, Page Down, Home and
 * End keys move between them.
 *
 * @param container Element the slides are rendered into.
 * @param onChange  Called when full screen starts or ends.
 * @return `showCurrentSlide` to call after the slides are rendered again, to
 *         keep the current slide shown, and `toggle` to toggle full screen.
 */
export function setupFullscreen(
	container: HTMLElement,
	onChange: ( fullscreen: boolean ) => void
): { showCurrentSlide: () => void; toggle: () => void } {
	const appWindow = getCurrentWebviewWindow();
	let fullscreen = false;
	let current = 0;
	// The slide to keep in view while the window shrinks back from full
	// screen, until the user moves the view on their own.
	let anchor: number | null = null;

	function getSlides() {
		return Array.from(
			container.querySelectorAll< SVGSVGElement >(
				':scope > .marpit > svg'
			)
		);
	}

	function showCurrentSlide() {
		const slides = getSlides();
		// An edit can remove slides while one of them is shown.
		current = clampSlideIndex( current, slides.length );
		slides.forEach( ( slide, index ) =>
			slide.classList.toggle(
				CURRENT_SLIDE_CLASS,
				fullscreen && index === current
			)
		);
	}

	function scrollToAnchor() {
		if ( anchor !== null ) {
			getSlides()[ anchor ]?.scrollIntoView( { block: 'center' } );
		}
	}

	function update( value: boolean ) {
		if ( value === fullscreen ) {
			return;
		}
		if ( value ) {
			current = findMostVisibleSlide( getSlides() );
			anchor = null;
		}
		fullscreen = value;
		document.documentElement.classList.toggle( FULLSCREEN_CLASS, value );
		showCurrentSlide();
		if ( ! value ) {
			anchor = current;
			scrollToAnchor();
		}
		onChange( value );
	}

	async function syncWithWindow() {
		update( await appWindow.isFullscreen() );
	}

	function setFullscreen( value: boolean ) {
		// Switches the view right away, rather than once the window resizes.
		update( value );
		appWindow.setFullscreen( value ).catch( syncWithWindow );
	}

	function toggle() {
		setFullscreen( ! fullscreen );
	}

	for ( const type of [ 'wheel', 'pointerdown', 'keydown' ] as const ) {
		window.addEventListener(
			type,
			() => {
				anchor = null;
			},
			{ passive: true }
		);
	}
	window.addEventListener( 'resize', scrollToAnchor );

	window.addEventListener( 'keydown', ( event ) => {
		if ( event.ctrlKey || event.metaKey || event.altKey ) {
			return;
		}
		if ( fullscreen ) {
			// Holding a key keeps moving through the slides.
			const index = getSlideIndexForKey(
				event.key,
				current,
				getSlides().length
			);
			if ( index !== null ) {
				event.preventDefault();
				current = index;
				showCurrentSlide();
				return;
			}
		}
		if ( event.repeat ) {
			return;
		}
		if ( event.key.toLowerCase() === 'f' || event.key === 'F11' ) {
			event.preventDefault();
			toggle();
		} else if ( event.key === 'Escape' && fullscreen ) {
			event.preventDefault();
			setFullscreen( false );
		}
	} );

	// Full screen can also end without the `F` key, such as with the green
	// button on macOS.
	void appWindow.onResized( () => void syncWithWindow() );

	return { showCurrentSlide, toggle };
}
