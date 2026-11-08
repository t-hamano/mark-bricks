/**
 * External dependencies
 */
import { createSlidePreview } from '@mark-bricks/marp-preview/controls';

/**
 * Internal dependencies
 */
import type { PreviewCommand, PreviewEvent } from './constants';

function send( event: PreviewEvent ) {
	window.parent.postMessage( event, location.origin );
}

// The line of the selected block, which every render with slides moves to: the
// editor reports a selection right away, but the document that holds it,
// such as one with a new slide, only after a while, and possibly after the
// renders of earlier edits.
let selectedLine: number | null = null;

// Shows the controls in the locale that the main window opened the frame
// with. The main window handles the slide mode, which `F` and F11 toggle: it
// makes the frame fill the window in full screen. The slides follow the
// selected block in the editor, which they highlight.
const preview = createSlidePreview( document.body, {
	locale: new URLSearchParams( location.search ).get( 'locale' ) ?? 'en',
	toggleKeys: [ 'f', 'F11' ],
	onSlideModeRequest: ( enabled ) =>
		send( { type: 'slide-mode-request', enabled } ),
	onSourceLineClick: ( line ) => send( { type: 'line-click', line } ),
	onRender: ( slideCount ) => {
		if ( slideCount > 0 && selectedLine !== null ) {
			preview.revealSourceLine( selectedLine );
		}
	},
} );

window.addEventListener( 'message', ( event: MessageEvent ) => {
	if ( event.source !== window.parent || event.origin !== location.origin ) {
		return;
	}
	const command = event.data as PreviewCommand;
	switch ( command.type ) {
		case 'slides':
			preview.render( command.slides );
			break;
		case 'selected-line':
			selectedLine = command.line;
			preview.revealSourceLine( selectedLine );
			break;
		case 'slide-mode':
			preview.setSlideMode( command.enabled );
			break;
	}
} );

send( { type: 'ready' } );
