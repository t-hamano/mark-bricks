/**
 * Internal dependencies
 */
import {
	clampSlideIndex,
	createWheelTracker,
	getSlideIndexForKey,
} from './navigation';
import type { SlideView } from './slide-view';

const SLIDE_MODE_CLASS = 'is-slide-mode';
const CURRENT_SLIDE_CLASS = 'is-current';

export type SlideMode = {
	isEnabled: () => boolean;
	setEnabled: ( enabled: boolean ) => void;
	showCurrentSlide: () => void;
	goToSlide: ( index: number ) => void;
};

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
 * Adds a slide mode, which presents the slides one at a time, starting from
 * the one most visible in the scrolling view, and lets the arrow, Page Up,
 * Page Down, Home and End keys and the wheel move between them. Leaving it
 * scrolls back to the slide shown last. Outside the slide mode, the current
 * slide is the one most visible in the scrolling view.
 *
 * @param view          The view showing the slides.
 * @param onSlideChange Called with the index of the current slide and the
 *                      number of slides, when either changes.
 * @return `isEnabled` and `setEnabled` to read and turn the slide mode on or
 *         off, `showCurrentSlide` to call after the slides are rendered again,
 *         to keep the current slide shown, and `goToSlide` to move to a slide.
 */
export function createSlideMode(
	view: Pick< SlideView, 'getSlides' >,
	onSlideChange?: ( current: number, count: number ) => void
): SlideMode {
	let enabled = false;
	let current = 0;
	// The slide to keep in view after leaving the slide mode, such as while
	// the window shrinks back from full screen, or after moving to a slide
	// outside it, until the user moves the view on their own.
	let anchor: number | null = null;
	// What `onSlideChange` was last called with.
	let reported = { current: -1, count: -1 };

	function showCurrentSlide() {
		const slides = view.getSlides();
		if ( anchor !== null ) {
			anchor = clampSlideIndex( anchor, slides.length );
		}
		if ( ! enabled ) {
			current = anchor ?? findMostVisibleSlide( slides );
		}
		// An edit can remove slides while one of them is shown.
		current = clampSlideIndex( current, slides.length );
		slides.forEach( ( slide, index ) =>
			slide.classList.toggle(
				CURRENT_SLIDE_CLASS,
				enabled && index === current
			)
		);
		if (
			current !== reported.current ||
			slides.length !== reported.count
		) {
			reported = { current, count: slides.length };
			onSlideChange?.( current, slides.length );
		}
	}

	function scrollToAnchor() {
		if ( anchor !== null ) {
			view.getSlides()[ anchor ]?.scrollIntoView( { block: 'center' } );
		}
	}

	function setEnabled( value: boolean ) {
		if ( value === enabled ) {
			return;
		}
		if ( value ) {
			current = anchor ?? findMostVisibleSlide( view.getSlides() );
			anchor = null;
		} else {
			anchor = current;
		}
		enabled = value;
		document.documentElement.classList.toggle( SLIDE_MODE_CLASS, value );
		showCurrentSlide();
		scrollToAnchor();
	}

	function goToSlide( index: number ) {
		if ( enabled ) {
			current = index;
		} else {
			anchor = clampSlideIndex( index, view.getSlides().length );
			scrollToAnchor();
		}
		showCurrentSlide();
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
	window.addEventListener( 'resize', () => {
		scrollToAnchor();
		showCurrentSlide();
	} );
	window.addEventListener( 'scroll', showCurrentSlide, { passive: true } );

	const trackWheel = createWheelTracker();
	window.addEventListener(
		'wheel',
		( event ) => {
			if (
				! enabled ||
				event.ctrlKey ||
				// Leaves the wheel to an open list, such as a pager's list of
				// slides.
				( event.target instanceof Element &&
					event.target.closest( '[role="listbox"]' ) )
			) {
				return;
			}
			const step = trackWheel( event );
			if ( step !== 0 ) {
				current = clampSlideIndex(
					current + step,
					view.getSlides().length
				);
				showCurrentSlide();
			}
		},
		{ passive: true }
	);

	window.addEventListener( 'keydown', ( event ) => {
		if ( ! enabled || event.ctrlKey || event.metaKey || event.altKey ) {
			return;
		}
		// Holding a key keeps moving through the slides.
		const index = getSlideIndexForKey(
			event.key,
			current,
			view.getSlides().length
		);
		if ( index !== null ) {
			event.preventDefault();
			current = index;
			showCurrentSlide();
		}
	} );

	return {
		isEnabled: () => enabled,
		setEnabled,
		showCurrentSlide,
		goToSlide,
	};
}
