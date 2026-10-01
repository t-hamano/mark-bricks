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
import { PREVIEW_MARKDOWN_EVENT, PREVIEW_READY_EVENT } from './constants';
import { renderSlides } from './render';
import './style.css';

const style = document.createElement( 'style' );
const slides = document.createElement( 'div' );
document.head.append( style );
document.body.append( slides );

// Scales auto-scaling elements, and lays out the slides in WebKit, which
// cannot render HTML inside an SVG on its own.
browser( slides );

let pending: string | null = null;

// Renders the latest Markdown once per frame, however often it arrives.
function scheduleRender( markdown: string ) {
	if ( pending === null ) {
		requestAnimationFrame( () => {
			const { html, css } = renderSlides( pending ?? '' );
			pending = null;
			style.textContent = css;
			slides.innerHTML = html;
		} );
	}
	pending = markdown;
}

async function main() {
	await getCurrentWebviewWindow().listen< string >(
		PREVIEW_MARKDOWN_EVENT,
		( { payload } ) => scheduleRender( payload )
	);
	await emitTo( 'main', PREVIEW_READY_EVENT );
}

void main();
