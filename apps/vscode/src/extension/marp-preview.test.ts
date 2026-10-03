/**
 * External dependencies
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';

/**
 * Internal dependencies
 */
import type { PreviewHostMessage } from '../shared/messages';
import {
	Uri,
	ViewColumn,
	addWorkspaceFolder,
	createDocument,
	fireOpenDocument,
	getListenerCount,
	getWebviewPanelSerializer,
	getWebviewPanels,
	resetVscode,
	FakeWebviewPanel,
} from './__mocks__/vscode';
import { MarpPreview } from './marp-preview';

const DOCUMENT_PATH = '/workspace/docs/deck.md';
const DECK = '---\nmarp: true\n---\n\n# One\n\n---\n\n# Two\n';

// Rendering waits for Marp to load, which the first test pays for.
const WAIT = { timeout: 30000 };

function register() {
	MarpPreview.register( {
		extensionUri: Uri.file( '/extension' ),
	} as unknown as vscode.ExtensionContext );
}

/**
 * Opens the preview of a new document.
 *
 * @param text Document text.
 */
async function openPreview( text = DECK ) {
	register();
	const document = createDocument( DOCUMENT_PATH, text );
	await MarpPreview.show( document.uri );
	const [ panel ] = getWebviewPanels();
	return { document, panel };
}

// The messages the host posted to the panel that render something.
function rendered( panel: FakeWebviewPanel ) {
	return ( panel.posted as PreviewHostMessage[] ).filter(
		( message ) => message.type !== 'document'
	);
}

function countSlides( message: PreviewHostMessage | undefined ) {
	return message?.type === 'slides'
		? message.html.match( /<svg data-marpit-svg/g )?.length
		: undefined;
}

beforeEach( () => {
	resetVscode();
} );

afterEach( () => {
	// Closes the previews, which `MarpPreview` keeps across tests.
	for ( const panel of getWebviewPanels() ) {
		panel.dispose();
	}
} );

describe( 'opening the slide preview', () => {
	it( 'opens a panel beside the editor, keeping the focus there', async () => {
		const { panel } = await openPreview();

		expect( panel.viewType ).toBe( MarpPreview.viewType );
		expect( panel.showOptions ).toEqual( {
			viewColumn: ViewColumn.Beside,
			preserveFocus: true,
		} );
		expect( panel.title ).toBe( 'Slide Preview: deck.md' );
	} );

	it( 'reveals the open preview instead of opening another', async () => {
		const { document, panel } = await openPreview();

		await MarpPreview.show( document.uri );

		expect( getWebviewPanels() ).toHaveLength( 1 );
		expect( panel.reveal ).toHaveBeenCalledWith( undefined, true );
	} );

	it( 'opens one panel when asked again while the document opens', async () => {
		register();
		const document = createDocument( DOCUMENT_PATH, DECK );

		await Promise.all( [
			MarpPreview.show( document.uri ),
			MarpPreview.show( document.uri ),
		] );

		expect( getWebviewPanels() ).toHaveLength( 1 );
		expect( getWebviewPanels()[ 0 ].reveal ).toHaveBeenCalledWith(
			undefined,
			true
		);
	} );

	it( 'allows the webview to load from the bundle and the image folders', async () => {
		addWorkspaceFolder( '/workspace' );
		const { panel } = await openPreview();

		expect(
			panel.webview.options.localResourceRoots?.map( ( uri ) =>
				uri.toString()
			)
		).toEqual( [
			'file:///extension/dist/preview',
			'file:///workspace/docs',
			'file:///workspace',
		] );
	} );
} );

describe( 'rendering', () => {
	it( 'renders the slides once the webview is ready', async () => {
		const { document, panel } = await openPreview();
		expect( panel.posted ).toEqual( [] );

		panel.send( { type: 'ready' } );

		// Tells the webview which document to save in its state, and the
		// text of its controls.
		expect( panel.posted[ 0 ] ).toEqual( {
			type: 'document',
			uri: document.uri.toString(),
			labels: {
				enterSlideMode: 'Enter slide mode',
				exitSlideMode: 'Exit slide mode',
				exitSlideModeHint: 'Press F or Escape to exit slide mode',
				previousSlide: 'Previous slide',
				nextSlide: 'Next slide',
				slideNumber: 'Slide number',
				slideLabel: 'Slide %1$d of %2$d',
			},
		} );
		await vi.waitFor(
			() => expect( rendered( panel ) ).toHaveLength( 1 ),
			WAIT
		);
		expect( countSlides( rendered( panel )[ 0 ] ) ).toBe( 2 );
	} );

	it( 'shows a notice for a document that is not a Marp deck', async () => {
		const { panel } = await openPreview( '# Notes\n' );

		panel.send( { type: 'ready' } );

		await vi.waitFor( () =>
			expect( rendered( panel ) ).toEqual( [
				{ type: 'notice', text: 'Not a Marp document' },
			] )
		);
	} );

	it( 'points local images at the webview', async () => {
		addWorkspaceFolder( '/workspace' );
		const { panel } = await openPreview(
			'---\nmarp: true\n---\n\n![](images/a.png)\n\n![bg](https://example.com/b.png)\n'
		);

		panel.send( { type: 'ready' } );

		await vi.waitFor( () => expect( rendered( panel ) ).toHaveLength( 1 ) );
		const [ message ] = rendered( panel );
		expect( message.type === 'slides' && message.html ).toContain(
			'src="webview:file:///workspace/docs/images/a.png"'
		);
		expect( message.type === 'slides' && message.html ).toContain(
			'https://example.com/b.png'
		);
	} );

	it( 'renders again once edits settle', async () => {
		const { document, panel } = await openPreview();
		panel.send( { type: 'ready' } );
		await vi.waitFor( () => expect( rendered( panel ) ).toHaveLength( 1 ) );

		document.setText( `${ DECK }\n---\n\n# Three\n` );
		document.setText( `${ DECK }\n---\n\n# Three\n\n---\n\n# Four\n` );
		expect( rendered( panel ) ).toHaveLength( 1 );

		await vi.waitFor( () => expect( rendered( panel ) ).toHaveLength( 2 ) );
		expect( countSlides( rendered( panel )[ 1 ] ) ).toBe( 4 );
	} );

	it( 'follows the document when it is opened again', async () => {
		const { panel } = await openPreview();
		panel.send( { type: 'ready' } );
		await vi.waitFor( () => expect( rendered( panel ) ).toHaveLength( 1 ) );

		fireOpenDocument(
			createDocument( DOCUMENT_PATH, `${ DECK }\n---\n\n# Three\n` )
		);

		await vi.waitFor( () => expect( rendered( panel ) ).toHaveLength( 2 ) );
		expect( countSlides( rendered( panel )[ 1 ] ) ).toBe( 3 );
	} );

	it( 'drops a render that a newer one replaced while waiting for Marp', async () => {
		const { document, panel } = await openPreview();
		panel.send( { type: 'ready' } );
		await vi.waitFor(
			() => expect( rendered( panel ) ).toHaveLength( 1 ),
			WAIT
		);

		// Starts a render of slides, which waits for Marp, then removes
		// `marp: true`, whose render posts the notice without waiting.
		vi.useFakeTimers();
		document.setText( `${ DECK }\n---\n\n# Three\n` );
		vi.advanceTimersByTime( 100 );
		document.setText( '# Notes\n' );
		vi.advanceTimersByTime( 100 );
		vi.useRealTimers();
		await new Promise( ( resolve ) => setTimeout( resolve, 50 ) );

		expect( rendered( panel ).slice( 1 ) ).toEqual( [
			{ type: 'notice', text: 'Not a Marp document' },
		] );
	} );

	it( 'ignores edits before the webview is ready', async () => {
		const { document, panel } = await openPreview();

		document.setText( `${ DECK }\n---\n\n# Three\n` );

		await new Promise( ( resolve ) => setTimeout( resolve, 200 ) );
		expect( panel.posted ).toEqual( [] );
	} );
} );

describe( 'restoring after a restart', () => {
	// Registers the serializer and returns it with a panel to restore.
	function restore() {
		register();
		const serializer = getWebviewPanelSerializer(
			MarpPreview.viewType
		) as vscode.WebviewPanelSerializer;
		return {
			serializer,
			panel: new FakeWebviewPanel( MarpPreview.viewType ),
		};
	}

	it( 'previews the document saved in the webview state', async () => {
		const document = createDocument( DOCUMENT_PATH, DECK );
		const { serializer, panel } = restore();

		await serializer.deserializeWebviewPanel(
			panel as unknown as vscode.WebviewPanel,
			{ uri: document.uri.toString() }
		);

		expect( panel.title ).toBe( 'Slide Preview: deck.md' );
		panel.send( { type: 'ready' } );
		await vi.waitFor( () => expect( rendered( panel ) ).toHaveLength( 1 ) );
		expect( MarpPreview.getSlideCount( document.uri ) ).toBe( null );
		panel.send( { type: 'rendered', slideCount: 2 } );
		expect( MarpPreview.getSlideCount( document.uri ) ).toBe( 2 );
		panel.dispose();
	} );

	it( 'closes a panel restored for a document another panel previews', async () => {
		const document = createDocument( DOCUMENT_PATH, DECK );
		const { serializer, panel } = restore();
		const other = new FakeWebviewPanel( MarpPreview.viewType );
		const onDispose = vi.fn();
		other.onDidDispose( onDispose );
		const state = { uri: document.uri.toString() };

		await Promise.all( [
			serializer.deserializeWebviewPanel(
				panel as unknown as vscode.WebviewPanel,
				state
			),
			serializer.deserializeWebviewPanel(
				other as unknown as vscode.WebviewPanel,
				state
			),
		] );

		expect( onDispose ).toHaveBeenCalled();
		// The preview stays open in the first panel.
		panel.send( { type: 'rendered', slideCount: 2 } );
		expect( MarpPreview.getSlideCount( document.uri ) ).toBe( 2 );
		panel.dispose();
	} );

	it.each( [
		[ 'has no state', undefined ],
		[ 'previews a document that is gone', { uri: 'file:///gone.md' } ],
	] )( 'closes a panel that %s', async ( _name, state ) => {
		const { serializer, panel } = restore();
		const onDispose = vi.fn();
		panel.onDidDispose( onDispose );

		await serializer.deserializeWebviewPanel(
			panel as unknown as vscode.WebviewPanel,
			state
		);

		expect( onDispose ).toHaveBeenCalled();
	} );
} );

describe( 'closing', () => {
	it( 'forgets the preview and stops listening to the workspace', async () => {
		const { document, panel } = await openPreview();
		panel.send( { type: 'rendered', slideCount: 2 } );
		expect( MarpPreview.getSlideCount( document.uri ) ).toBe( 2 );

		panel.dispose();

		expect( MarpPreview.getSlideCount( document.uri ) ).toBe( null );
		expect( getListenerCount() ).toBe( 0 );
	} );

	it( 'opens a new panel after the preview was closed', async () => {
		const { document, panel } = await openPreview();
		panel.dispose();

		await MarpPreview.show( document.uri );

		expect( getWebviewPanels() ).toHaveLength( 2 );
	} );
} );
