/**
 * External dependencies
 */
import {
	createSlideMode,
	createSlideView,
} from '@mark-bricks/marp-preview/browser';
import { createPreviewControls } from '@mark-bricks/marp-preview/controls';

/**
 * Internal dependencies
 */
import type {
	PreviewHostMessage,
	PreviewState,
	PreviewWebviewMessage,
} from '../shared/messages';
import './style.css';

const host = acquireVsCodeApi();

function post( message: PreviewWebviewMessage ): void {
	host.postMessage( message );
}

const view = createSlideView( document.body, () => {
	slideMode.showCurrentSlide();
	post( { type: 'rendered', slideCount: view.getSlides().length } );
} );
const controls = createPreviewControls( toggleSlideMode, ( index ) =>
	slideMode.goToSlide( index )
);
const slideMode = createSlideMode( view, controls.setSlide );

// The slide mode stays within the panel: webviews cannot enter full screen,
// and maximizing the panel is left to the user.
function setSlideMode( enabled: boolean ) {
	if ( enabled !== slideMode.isEnabled() ) {
		slideMode.setEnabled( enabled );
		controls.setSlideMode( enabled );
	}
}

function toggleSlideMode() {
	setSlideMode( ! slideMode.isEnabled() );
}

// F11 is left to VS Code, which uses it to toggle full screen.
window.addEventListener( 'keydown', ( event ) => {
	if ( event.ctrlKey || event.metaKey || event.altKey || event.repeat ) {
		return;
	}
	if ( event.key.toLowerCase() === 'f' ) {
		event.preventDefault();
		toggleSlideMode();
	} else if ( event.key === 'Escape' && slideMode.isEnabled() ) {
		event.preventDefault();
		setSlideMode( false );
	}
} );

window.addEventListener( 'message', ( event: MessageEvent ) => {
	const message = event.data as PreviewHostMessage;
	if ( message.type === 'document' ) {
		host.setState< PreviewState >( { uri: message.uri } );
		controls.setLabels( message.labels );
	} else if ( message.type === 'notice' ) {
		view.render( { notice: message.text } );
	} else {
		view.render( { html: message.html, css: message.css } );
	}
} );
post( { type: 'ready' } );
