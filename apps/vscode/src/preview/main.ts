/**
 * External dependencies
 */
import { createSlidePreview } from '@mark-bricks/marp-preview/controls';

/**
 * Internal dependencies
 */
import { resolveVsCodeLocale } from '../shared/locale';
import type {
	PreviewHostMessage,
	PreviewState,
	PreviewWebviewMessage,
} from '../shared/messages';

const host = acquireVsCodeApi();

function post( message: PreviewWebviewMessage ): void {
	host.postMessage( message );
}

// Shows the controls in VS Code's display language, which the page's `lang`
// holds. The slide mode stays within the panel: webviews cannot enter full
// screen, and maximizing the panel is left to the user. F11 is left to VS
// Code, which uses it to toggle full screen.
// The line of the selected block, which each render moves to again: the
// editor reports a selection right away, but the document that holds it,
// such as one with a new slide, only after a while, and possibly after the
// renders of earlier edits.
let selectedLine: number | null = null;

// The slides follow the block selected in the visual editor, by slide.
const preview = createSlidePreview( document.body, {
	locale: resolveVsCodeLocale( document.documentElement.lang ),
	onRender: ( slideCount ) => {
		if ( slideCount > 0 && selectedLine !== null ) {
			preview.revealSourceLine( selectedLine );
		}
		post( { type: 'rendered', slideCount } );
	},
	sourceSyncLevel: 'slide',
	onSourceLineClick: ( line ) => post( { type: 'lineClick', line } ),
} );

window.addEventListener( 'message', ( event: MessageEvent ) => {
	const message = event.data as PreviewHostMessage;
	if ( message.type === 'document' ) {
		host.setState< PreviewState >( { uri: message.uri } );
	} else if ( message.type === 'notice' ) {
		preview.render( { notice: message.text } );
	} else if ( message.type === 'selectedLine' ) {
		selectedLine = message.line;
		preview.revealSourceLine( selectedLine );
	} else {
		preview.render( { html: message.html, css: message.css } );
	}
} );
post( { type: 'ready' } );
