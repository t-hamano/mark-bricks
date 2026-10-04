/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { createSlideMode } from '../../browser/slide-mode';
import { createToolbar } from './toolbar';

/**
 * Lists the slides of an exported page, which Marp renders straight into the
 * `<body>`.
 *
 * @return The slides, in order.
 */
function getSlides(): SVGSVGElement[] {
	return Array.from(
		document.querySelectorAll< SVGSVGElement >(
			'body > svg[data-marpit-svg]'
		)
	);
}

/**
 * Adds the preview's navigation to an exported page: the toolbar, and the
 * slide mode, which the toolbar's button and `F` turn on and off, and
 * `Escape` turns off. The slide mode comes with full screen where the
 * browser allows it, and ends with it.
 *
 * @param locale Language tag of the toolbar's strings, if not English.
 */
export function setupExportedDeck( locale?: string ) {
	// Names each slide for screen readers by its number.
	const slides = getSlides();
	slides.forEach( ( slide, index ) => {
		slide.setAttribute( 'role', 'group' );
		slide.setAttribute(
			'aria-label',
			sprintf(
				/* translators: 1: Slide number. 2: Number of slides. */
				__( 'Slide %1$d of %2$d', 'mark-bricks' ),
				index + 1,
				slides.length
			)
		);
	} );

	const toolbar = createToolbar(
		() => {
			requestSlideMode( ! slideMode.isEnabled() );
			// Moves the focus from the button to the slide, so that Enter and
			// Space do not press the button again.
			slideMode.focusCurrentSlide();
		},
		( index ) => slideMode.goToSlide( index ),
		locale
	);
	const slideMode = createSlideMode( { getSlides }, toolbar.setSlide );

	function setSlideMode( enabled: boolean ) {
		if ( enabled !== slideMode.isEnabled() ) {
			slideMode.setEnabled( enabled );
			toolbar.setSlideMode( enabled );
		}
	}

	function requestSlideMode( enabled: boolean ) {
		// Switches the view right away, rather than once full screen starts.
		setSlideMode( enabled );
		const root = document.documentElement;
		if ( enabled && ! document.fullscreenElement ) {
			// A browser without full screen, such as Safari on iPhone, keeps
			// to the slide mode.
			root.requestFullscreen?.().catch( () => {} );
		} else if ( ! enabled && document.fullscreenElement ) {
			document.exitFullscreen().catch( () => {} );
		}
	}

	// Full screen can also end without the page, such as with Escape, which
	// the browser keeps to itself.
	document.addEventListener( 'fullscreenchange', () => {
		if ( ! document.fullscreenElement ) {
			setSlideMode( false );
		}
	} );

	// The page scrolls its `<body>`, as Marp CLI's `bare` template does,
	// which the slide mode does not watch on its own.
	document.body.addEventListener( 'scroll', slideMode.showCurrentSlide, {
		passive: true,
	} );

	window.addEventListener( 'keydown', ( event ) => {
		if ( event.ctrlKey || event.metaKey || event.altKey || event.repeat ) {
			return;
		}
		// Checked first, so that Escape only ever leaves the slide mode.
		if ( event.key === 'Escape' ) {
			if ( slideMode.isEnabled() ) {
				event.preventDefault();
				requestSlideMode( false );
			}
		} else if ( event.key.toLowerCase() === 'f' ) {
			event.preventDefault();
			requestSlideMode( ! slideMode.isEnabled() );
		}
	} );

	slideMode.showCurrentSlide();
}
