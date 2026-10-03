/**
 * Internal dependencies
 */
import type { PreviewLabels } from '../render';
import { createSlideMode, createSlideView, type SlideView } from '../browser';
import { createPreviewControls } from './controls';

export type SlidePreviewOptions = {
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
};

export type SlidePreview = {
	render: SlideView[ 'render' ];
	setLabels: ( labels: PreviewLabels ) => void;
	isSlideMode: () => boolean;
	setSlideMode: ( enabled: boolean ) => void;
};

/**
 * Sets up a slide preview page: the slides with their controls and the slide
 * mode, which the toolbar's button and the keys turn on and off.
 *
 * @param container Element to add the slides and the notice to.
 * @param options   How the page toggles the slide mode, and what it does
 *                  after each render.
 * @return `render` to show content on the next frame, `setLabels` to set the
 *         text of the controls and the slides' names for screen readers, and
 *         `isSlideMode` and `setSlideMode` to read and turn the slide mode on
 *         or off.
 */
export function createSlidePreview(
	container: HTMLElement,
	options: SlidePreviewOptions = {}
): SlidePreview {
	const { toggleKeys = [ 'f' ], onSlideModeRequest, onRender } = options;
	const view = createSlideView( container, () => {
		slideMode.showCurrentSlide();
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

	function setLabels( labels: PreviewLabels ) {
		view.setSlideLabel( labels.slideLabel );
		controls.setLabels( labels );
	}

	return {
		render: view.render,
		setLabels,
		isSlideMode: slideMode.isEnabled,
		setSlideMode,
	};
}
