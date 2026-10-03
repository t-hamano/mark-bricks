/**
 * External dependencies
 */
import { emitTo } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import {
	applyLocale,
	createSlidePreview,
} from '@mark-bricks/marp-preview/controls';

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

// Shows the controls in the locale that the main window opened the window
// with.
applyLocale( new URLSearchParams( location.search ).get( 'locale' ) ?? 'en' );

// The slide mode comes with full screen, which `F` and F11 toggle.
const preview = createSlidePreview( document.body, {
	toggleKeys: [ 'f', 'F11' ],
	onSlideModeRequest: ( enabled ) => fullscreen.setFullscreen( enabled ),
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
	await emitTo( 'main', PREVIEW_READY_EVENT );
}

void main();
