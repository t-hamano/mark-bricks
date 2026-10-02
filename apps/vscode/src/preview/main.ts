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
import type {
	PreviewHostMessage,
	PreviewState,
	PreviewWebviewMessage,
} from '../shared/messages';
import './style.css';

// The messages that change what the preview shows.
type RenderMessage = Exclude< PreviewHostMessage, { type: 'document' } >;

const host = acquireVsCodeApi();

function post( message: PreviewWebviewMessage ): void {
	host.postMessage( message );
}

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

function render( message: RenderMessage ) {
	if ( message.type === 'notice' ) {
		style.textContent = '';
		slides.innerHTML = '';
		notice.textContent = message.text;
		notice.hidden = false;
		post( { type: 'rendered', slideCount: 0 } );
		return;
	}
	notice.hidden = true;
	style.textContent = rewriteFontSources( message.css );
	slides.innerHTML = message.html;
	marpBrowser.update();
	post( {
		type: 'rendered',
		slideCount: slides.querySelectorAll( ':scope > .marpit > svg' ).length,
	} );
}

let pending: RenderMessage | null = null;

// Renders the latest slides once per frame, however often they arrive.
function scheduleRender( message: RenderMessage ) {
	if ( pending === null ) {
		requestAnimationFrame( () => {
			const latest = pending;
			pending = null;
			if ( latest ) {
				render( latest );
			}
		} );
	}
	pending = message;
}

window.addEventListener( 'message', ( event: MessageEvent ) => {
	const message = event.data as PreviewHostMessage;
	if ( message.type === 'document' ) {
		host.setState< PreviewState >( { uri: message.uri } );
	} else {
		scheduleRender( message );
	}
} );
post( { type: 'ready' } );
