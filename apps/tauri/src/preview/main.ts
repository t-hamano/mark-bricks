/**
 * External dependencies
 */
import { emitTo } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import {
	createSlideMode,
	createSlideView,
} from '@mark-bricks/marp-preview/browser';
import { createPreviewControls } from '@mark-bricks/marp-preview/controls';

/**
 * WordPress dependencies
 */
import '@wordpress/theme/design-tokens.css';

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

const view = createSlideView( document.body, () =>
	slideMode.showCurrentSlide()
);
const controls = createPreviewControls(
	() => fullscreen.toggle(),
	( index ) => slideMode.goToSlide( index )
);
const slideMode = createSlideMode( view, controls.setSlide );
const fullscreen = setupFullscreen( slideMode, controls.setSlideMode );

async function main() {
	await getCurrentWebviewWindow().listen< PreviewPayload >(
		PREVIEW_DOCUMENT_EVENT,
		( { payload } ) =>
			// Renders the deck on the next frame, once however often it
			// arrives.
			view.render( () => {
				controls.setLabels( payload.labels );
				return 'notice' in payload
					? { notice: payload.notice }
					: renderSlides( payload.markdown, payload.documentPath );
			} )
	);
	await emitTo( 'main', PREVIEW_READY_EVENT );
}

void main();
