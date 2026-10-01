/**
 * External dependencies
 */
import { emitTo } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { browser } from '@marp-team/marp-core/browser';
// The web fonts of the built-in Gaia theme.
import '@fontsource/lato/400.css';
import '@fontsource/lato/900.css';
import '@fontsource/roboto-mono/400.css';
import '@fontsource/roboto-mono/700.css';

/**
 * Internal dependencies
 */
import {
	PREVIEW_DOCUMENT_EVENT,
	PREVIEW_READY_EVENT,
	type PreviewPayload,
} from './constants';
import { setupFullscreen } from './fullscreen';
import { renderSlides } from './render';
import './style.css';

const style = document.createElement( 'style' );
const slides = document.createElement( 'div' );
const notice = document.createElement( 'p' );
notice.className = 'preview-notice';
notice.hidden = true;
document.head.append( style );
document.body.append( slides, notice );

// Scales auto-scaling elements, and lays out the slides in WebKit, which
// cannot render HTML inside an SVG on its own.
const marpBrowser = browser( slides );
const showCurrentSlide = setupFullscreen( slides );

function render( payload: PreviewPayload ) {
	if ( 'notice' in payload ) {
		style.textContent = '';
		slides.innerHTML = '';
		notice.textContent = payload.notice;
		notice.hidden = false;
		return;
	}
	notice.hidden = true;
	const { html, css } = renderSlides(
		payload.markdown,
		payload.documentPath
	);
	style.textContent = css;
	slides.innerHTML = html;
	// WebKit has no customized built-in elements, so Marp swaps in its
	// auto-scaling elements itself, but only for the slides present.
	marpBrowser.update();
	showCurrentSlide();
}

let pending: PreviewPayload | null = null;

// Renders the latest document once per frame, however often it arrives.
function scheduleRender( payload: PreviewPayload ) {
	if ( pending === null ) {
		requestAnimationFrame( () => {
			// Taken before rendering, so a deck that fails to render does not
			// stop later edits from being scheduled.
			const latest = pending;
			pending = null;
			if ( latest ) {
				render( latest );
			}
		} );
	}
	pending = payload;
}

async function main() {
	await getCurrentWebviewWindow().listen< PreviewPayload >(
		PREVIEW_DOCUMENT_EVENT,
		( { payload } ) => scheduleRender( payload )
	);
	await emitTo( 'main', PREVIEW_READY_EVENT );
}

void main();
