/**
 * External dependencies
 */
import { emitTo } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import {
	createSlidePreview,
	type PreviewPlacement,
} from '@mark-bricks/marp-preview/controls';

/**
 * Internal dependencies
 */
import {
	PREVIEW_COMMAND_EVENT,
	PREVIEW_EVENT,
	type PreviewCommand,
	type PreviewEvent,
} from './constants';
import { setupFullscreen } from './fullscreen';

const params = new URLSearchParams( location.search );
// Where the main window shows the page: in a frame next to the editor, or in
// a window of its own, which talks to it through Tauri's events instead.
const placement: PreviewPlacement =
	params.get( 'placement' ) === 'window' ? 'window' : 'panel';
const isWindow = placement === 'window';

function send( event: PreviewEvent ) {
	if ( isWindow ) {
		void emitTo( 'main', PREVIEW_EVENT, event );
	} else {
		window.parent.postMessage( event, location.origin );
	}
}

// The line of the selected block, which every render with slides moves to: the
// editor reports a selection right away, but the document that holds it,
// such as one with a new slide, only after a while, and possibly after the
// renders of earlier edits.
let selectedLine: number | null = null;

// Shows the controls in the locale that the main window opened the page with.
// `F` and F11 toggle the slide mode: the window enters full screen with it,
// and the main window makes the frame fill the window in full screen. The
// slides follow the selected block in the editor, which they highlight.
const preview = createSlidePreview( document.body, {
	locale: params.get( 'locale' ) ?? 'en',
	toggleKeys: [ 'f', 'F11' ],
	onSlideModeRequest: ( enabled ) =>
		isWindow
			? fullscreen?.setFullscreen( enabled )
			: send( { type: 'slide-mode-request', enabled } ),
	onSourceLineClick: ( line ) => send( { type: 'line-click', line } ),
	onRender: ( slideCount ) => {
		if ( slideCount > 0 && selectedLine !== null ) {
			preview.revealSourceLine( selectedLine );
		}
	},
	placementAction: {
		placement,
		onClick: () =>
			send( {
				type: 'placement-request',
				placement: isWindow ? 'panel' : 'window',
			} ),
	},
} );
const fullscreen = isWindow ? setupFullscreen( preview ) : null;

function handle( command: PreviewCommand ) {
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
}

if ( ! isWindow ) {
	// Keys do not cross into the main window, so the app's shortcuts, such as
	// saving, would not work while the slides have the focus. Passes on the
	// keys that may be one.
	window.addEventListener(
		'keydown',
		( event ) => {
			if ( ! event.ctrlKey && ! event.metaKey && ! event.altKey ) {
				return;
			}
			const forwarded = new KeyboardEvent( 'keydown', {
				key: event.key,
				code: event.code,
				ctrlKey: event.ctrlKey,
				metaKey: event.metaKey,
				altKey: event.altKey,
				shiftKey: event.shiftKey,
				repeat: event.repeat,
				bubbles: true,
				cancelable: true,
			} );
			window.parent.document.dispatchEvent( forwarded );
			if ( forwarded.defaultPrevented ) {
				event.preventDefault();
			}
		},
		{ capture: true }
	);
}

async function main() {
	if ( isWindow ) {
		await getCurrentWebviewWindow().listen< PreviewCommand >(
			PREVIEW_COMMAND_EVENT,
			( { payload } ) => handle( payload )
		);
	} else {
		window.addEventListener( 'message', ( event: MessageEvent ) => {
			if (
				event.source === window.parent &&
				event.origin === location.origin
			) {
				handle( event.data as PreviewCommand );
			}
		} );
	}
	send( { type: 'ready' } );
}

void main();
