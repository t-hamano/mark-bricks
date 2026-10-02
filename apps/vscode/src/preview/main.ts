/**
 * External dependencies
 */
import { createSlideView } from '@mark-bricks/marp-preview/browser';

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

const view = createSlideView( document.body, () =>
	post( { type: 'rendered', slideCount: view.getSlides().length } )
);

window.addEventListener( 'message', ( event: MessageEvent ) => {
	const message = event.data as PreviewHostMessage;
	if ( message.type === 'document' ) {
		host.setState< PreviewState >( { uri: message.uri } );
	} else if ( message.type === 'notice' ) {
		view.render( { notice: message.text } );
	} else {
		view.render( { html: message.html, css: message.css } );
	}
} );
post( { type: 'ready' } );
