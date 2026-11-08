/**
 * External dependencies
 */
import { emitTo } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { createSlidePreview } from '@mark-bricks/marp-preview/controls';

/**
 * Internal dependencies
 */
import {
	PREVIEW_DOCUMENT_EVENT,
	PREVIEW_LINE_CLICK_EVENT,
	PREVIEW_READY_EVENT,
	PREVIEW_SELECTED_LINE_EVENT,
	type PreviewLinePayload,
	type PreviewPayload,
} from './constants';
import { setupFullscreen } from './fullscreen';
import { renderSlides } from './render';

// The line of the selected block, until the next slides are shown, which
// the line moves to then: the editor reports a selection right away, but the
// document that holds it, such as one with a new slide, only after a while.
let pendingLine: number | null | undefined;

// Shows the controls in the locale that the main window opened the window
// with. The slide mode comes with full screen, which `F` and F11 toggle. The
// slides follow the selected block in the main window, which they highlight.
const preview = createSlidePreview( document.body, {
	locale: new URLSearchParams( location.search ).get( 'locale' ) ?? 'en',
	toggleKeys: [ 'f', 'F11' ],
	onSlideModeRequest: ( enabled ) => fullscreen.setFullscreen( enabled ),
	onSourceLineClick: ( line ) =>
		void emitTo( 'main', PREVIEW_LINE_CLICK_EVENT, {
			line,
		} satisfies PreviewLinePayload ),
	onRender: ( slideCount ) => {
		if ( slideCount > 0 && pendingLine !== undefined ) {
			preview.revealSourceLine( pendingLine );
			pendingLine = undefined;
		}
	},
} );
const fullscreen = setupFullscreen( preview );

async function main() {
	await getCurrentWebviewWindow().listen< PreviewPayload >(
		PREVIEW_DOCUMENT_EVENT,
		( { payload } ) =>
			// Renders the deck on the next frame, once however often it
			// arrives.
			preview.render( () => {
				return 'notice' in payload
					? { notice: payload.notice }
					: renderSlides( payload.markdown, payload.documentPath );
			} )
	);
	await getCurrentWebviewWindow().listen< PreviewLinePayload >(
		PREVIEW_SELECTED_LINE_EVENT,
		( { payload: { line } } ) => {
			preview.revealSourceLine( line );
			pendingLine = line;
		}
	);
	await emitTo( 'main', PREVIEW_READY_EVENT );
}

void main();
