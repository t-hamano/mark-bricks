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
	PREVIEW_READY_EVENT,
	type PreviewPayload,
} from './constants';
import { setupFullscreen } from './fullscreen';
import { renderSlides } from './render';

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
				preview.setLabels( payload.labels );
				return 'notice' in payload
					? { notice: payload.notice }
					: renderSlides( payload.markdown, payload.documentPath );
			} )
	);
	await emitTo( 'main', PREVIEW_READY_EVENT );
}

void main();
