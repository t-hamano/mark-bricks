/**
 * Internal dependencies
 */
import { createSlideMode } from '../browser/slide-mode';
import { createSlideView, type SlideView } from '../browser/slide-view';
import { findSourceElement, getSourceLine } from '../browser/source-lines';
import { createPreviewControls } from './controls';
import { applyLocale } from './i18n';

const HIGHLIGHT_CLASS = 'is-source-highlighted';

export type SlidePreviewOptions = {
	// WordPress locale slug of the controls' language (e.g. `ja`, `pt_BR`).
	// A locale without translations stays in English, as does no locale.
	locale?: string;
	// Keys that toggle the slide mode, as `KeyboardEvent.key`, matched
	// regardless of case. `Escape` always leaves it.
	toggleKeys?: string[];
	// Called when the user asks to turn the slide mode on or off, with the
	// toolbar's button or the keys. Defaults to `setSlideMode`. A host that
	// ties the slide mode to something else, such as the window's full
	// screen, handles it there and calls `setSlideMode` once it follows.
	onSlideModeRequest?: ( enabled: boolean ) => void;
	// Called with the number of slides each time new content is shown.
	onRender?: ( slideCount: number ) => void;
	// Called with the line of the Markdown that the clicked element starts
	// at, counted from 0, when the user clicks a slide outside the slide
	// mode.
	onSourceLineClick?: ( line: number ) => void;
};

export type SlidePreview = {
	render: SlideView[ 'render' ];
	isSlideMode: () => boolean;
	setSlideMode: ( enabled: boolean ) => void;
	revealSourceLine: ( line: number | null ) => void;
};

/**
 * Sets up a slide preview page: the slides with their controls and the slide
 * mode, which the toolbar's button and the keys turn on and off.
 *
 * @param container Element to add the slides and the notice to.
 * @param options   The controls' language, how the page toggles the slide
 *                  mode, and what it does after each render.
 * @return `render` to show content on the next frame, `isSlideMode` and
 *         `setSlideMode` to read and turn the slide mode on or off, and
 *         `revealSourceLine` to show the element of a line of the Markdown.
 */
export function createSlidePreview(
	container: HTMLElement,
	options: SlidePreviewOptions = {}
): SlidePreview {
	const {
		locale,
		toggleKeys = [ 'f' ],
		onSlideModeRequest,
		onRender,
		onSourceLineClick,
	} = options;
	if ( locale ) {
		applyLocale( locale );
	}
	const view = createSlideView( container, () => {
		slideMode.showCurrentSlide();
		// Rendering replaces the elements, the highlighted one included.
		highlight();
		onRender?.( view.getSlides().length );
	} );
	const controls = createPreviewControls(
		() => {
			requestSlideMode( ! slideMode.isEnabled() );
			// Moves the focus from the button to the slide, so that Enter and
			// Space do not press the button again.
			slideMode.focusCurrentSlide();
		},
		( index ) => slideMode.goToSlide( index )
	);
	const slideMode = createSlideMode( view, controls.setSlide );
	const keys = toggleKeys.map( ( key ) => key.toLowerCase() );

	function setSlideMode( enabled: boolean ) {
		if ( enabled !== slideMode.isEnabled() ) {
			slideMode.setEnabled( enabled );
			controls.setSlideMode( enabled );
		}
	}

	function requestSlideMode( enabled: boolean ) {
		( onSlideModeRequest ?? setSlideMode )( enabled );
	}

	// The line whose element is highlighted, if any.
	let highlightedLine: number | null = null;

	// Highlights the element of `highlightedLine`, and returns it.
	function highlight(): Element | null {
		container
			.querySelectorAll( `.${ HIGHLIGHT_CLASS }` )
			.forEach( ( element ) =>
				element.classList.remove( HIGHLIGHT_CLASS )
			);
		const element =
			highlightedLine === null
				? null
				: findSourceElement( container, highlightedLine );
		element?.classList.add( HIGHLIGHT_CLASS );
		return element;
	}

	function revealSourceLine( line: number | null ) {
		highlightedLine = line;
		const element = highlight();
		const slides = view.getSlides();
		const index = slides.findIndex( ( slide ) =>
			slide.contains( element )
		);
		if ( index === -1 ) {
			return;
		}
		// Leaves the view as it is while the slide is already in it, such as
		// after the user clicks it.
		const { top, bottom } = slides[ index ].getBoundingClientRect();
		if ( slideMode.isEnabled() || top < 0 || bottom > window.innerHeight ) {
			slideMode.goToSlide( index );
		}
	}

	container.addEventListener( 'click', ( event ) => {
		if ( slideMode.isEnabled() ) {
			return;
		}
		const line = getSourceLine( event.target );
		if ( line !== null ) {
			onSourceLineClick?.( line );
		}
	} );

	window.addEventListener( 'keydown', ( event ) => {
		if ( event.ctrlKey || event.metaKey || event.altKey || event.repeat ) {
			return;
		}
		// Checked first, so that Escape only ever leaves the slide mode, even
		// when it is one of the toggle keys.
		if ( event.key === 'Escape' ) {
			if ( slideMode.isEnabled() ) {
				event.preventDefault();
				requestSlideMode( false );
			}
		} else if ( keys.includes( event.key.toLowerCase() ) ) {
			event.preventDefault();
			requestSlideMode( ! slideMode.isEnabled() );
		}
	} );

	return {
		render: view.render,
		isSlideMode: slideMode.isEnabled,
		setSlideMode,
		revealSourceLine,
	};
}
