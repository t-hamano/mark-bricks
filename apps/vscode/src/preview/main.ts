/**
 * External dependencies
 */
import { createSlidePreview } from '@mark-bricks/marp-preview/controls';

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

// The slide mode stays within the panel: webviews cannot enter full screen,
// and maximizing the panel is left to the user. F11 is left to VS Code, which
// uses it to toggle full screen.
const preview = createSlidePreview( document.body, {
	onRender: ( slideCount ) => post( { type: 'rendered', slideCount } ),
} );

window.addEventListener( 'message', ( event: MessageEvent ) => {
	const message = event.data as PreviewHostMessage;
	if ( message.type === 'document' ) {
		host.setState< PreviewState >( { uri: message.uri } );
		preview.setLabels( message.labels );
	} else if ( message.type === 'notice' ) {
		preview.render( { notice: message.text } );
	} else {
		preview.render( { html: message.html, css: message.css } );
	}
} );
post( { type: 'ready' } );
