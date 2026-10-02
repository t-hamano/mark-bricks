/**
 * External dependencies
 */
import { browser } from '@marp-team/marp-core/browser';
import { rewriteFontSources } from '@mark-bricks/editor/katex-fonts';
// The web fonts of the built-in Gaia theme.
import '@fontsource/lato/400.css';
import '@fontsource/lato/900.css';
import '@fontsource/roboto-mono/400.css';
import '@fontsource/roboto-mono/700.css';

/**
 * Internal dependencies
 */
import type { RenderedSlides } from '..';
import './style.css';

// What the view shows: a deck's slides, or a notice when the document is not
// a Marp slide deck.
export type SlideContent = RenderedSlides | { notice: string };

export type SlideView = {
	render: ( content: SlideContent | ( () => SlideContent ) ) => void;
	getSlides: () => SVGSVGElement[];
};

/**
 * Adds a column of slides, or a notice in place of them, to a preview page.
 *
 * @param container Element to add the slides and the notice to.
 * @param onRender  Called each time the view shows new content.
 * @return `render` to show content on the next frame, and `getSlides` to
 *         list the slides shown. `render` takes a function too, to defer
 *         rendering the deck to that frame: only the latest content passed
 *         within a frame is shown.
 */
export function createSlideView(
	container: HTMLElement,
	onRender?: () => void
): SlideView {
	const style = document.createElement( 'style' );
	const slides = document.createElement( 'div' );
	const notice = document.createElement( 'p' );
	notice.className = 'preview-notice';
	notice.hidden = true;
	document.head.append( style );
	container.append( slides, notice );

	// Scales auto-scaling elements, and lays out the slides in WebKit, which
	// cannot render HTML inside an SVG on its own.
	const marpBrowser = browser( slides );

	function getSlides() {
		return Array.from(
			slides.querySelectorAll< SVGSVGElement >( ':scope > .marpit > svg' )
		);
	}

	function show( content: SlideContent ) {
		if ( 'notice' in content ) {
			style.textContent = '';
			slides.innerHTML = '';
			notice.textContent = content.notice;
			notice.hidden = false;
		} else {
			notice.hidden = true;
			// Points KaTeX at the fonts the page bundles.
			style.textContent = rewriteFontSources( content.css );
			slides.innerHTML = content.html;
			// WebKit has no customized built-in elements, so Marp swaps in its
			// auto-scaling elements itself, but only for the slides present.
			marpBrowser.update();
		}
		onRender?.();
	}

	let pending: ( () => SlideContent ) | null = null;

	function render( content: SlideContent | ( () => SlideContent ) ) {
		if ( pending === null ) {
			requestAnimationFrame( () => {
				// Taken before rendering, so a deck that fails to render does
				// not stop later edits from being scheduled.
				const latest = pending;
				pending = null;
				if ( latest ) {
					show( latest() );
				}
			} );
		}
		pending = typeof content === 'function' ? content : () => content;
	}

	return { render, getSlides };
}
