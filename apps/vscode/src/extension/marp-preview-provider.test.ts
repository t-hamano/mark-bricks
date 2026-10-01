/**
 * External dependencies
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';

/**
 * Internal dependencies
 */
import type {
	PreviewHostMessage,
	PreviewWebviewMessage,
} from '../shared/messages';
import {
	EventEmitter,
	Uri,
	addWorkspaceFolder,
	createDocument,
	getCustomEditorProvider,
	getListenerCount,
	resetVscode,
} from './__mocks__/vscode';
import { MarpPreviewProvider } from './marp-preview-provider';

const DOCUMENT_PATH = '/workspace/docs/deck.md';
const DECK = '---\nmarp: true\n---\n\n# One\n\n---\n\n# Two\n';

// Rendering waits for Marp to load, which the first test pays for.
const WAIT = { timeout: 30000 };

/**
 * Opens a document in the slide preview, returning handles to play the
 * webview's side of the conversation.
 *
 * @param text Initial document text.
 */
function openPreview( text = DECK ) {
	MarpPreviewProvider.register( {
		extensionUri: Uri.file( '/extension' ),
	} as unknown as vscode.ExtensionContext );
	const provider = getCustomEditorProvider(
		MarpPreviewProvider.viewType
	) as vscode.CustomTextEditorProvider;

	const document = createDocument( DOCUMENT_PATH, text );
	const messages = new EventEmitter< PreviewWebviewMessage >();
	const disposed = new EventEmitter< void >();
	const posted: PreviewHostMessage[] = [];
	const panel = {
		webview: {
			options: {},
			html: '',
			cspSource: 'vscode-webview:',
			onDidReceiveMessage: messages.event,
			postMessage: async ( message: PreviewHostMessage ) => {
				posted.push( message );
				return true;
			},
			asWebviewUri: ( uri: Uri ) => ( {
				toString: () => `webview:${ uri.toString() }`,
			} ),
		},
		onDidDispose: disposed.event,
	};

	void provider.resolveCustomTextEditor(
		document as unknown as vscode.TextDocument,
		panel as unknown as vscode.WebviewPanel,
		{} as vscode.CancellationToken
	);

	return {
		document,
		panel,
		posted,
		send: ( message: PreviewWebviewMessage ) => messages.fire( message ),
		close: () => disposed.fire(),
	};
}

beforeEach( () => {
	resetVscode();
} );

describe( 'slide preview', () => {
	it( 'renders the slides once the webview is ready', async () => {
		const { send, posted } = openPreview();
		expect( posted ).toEqual( [] );

		send( { type: 'ready' } );

		await vi.waitFor( () => expect( posted ).toHaveLength( 1 ), WAIT );
		const [ message ] = posted;
		expect( message.type ).toBe( 'slides' );
		expect(
			message.type === 'slides' &&
				message.html.match( /<svg data-marpit-svg/g )
		).toHaveLength( 2 );
	} );

	it( 'shows a notice for a document that is not a Marp deck', async () => {
		const { send, posted } = openPreview( '# Notes\n' );

		send( { type: 'ready' } );

		await vi.waitFor( () =>
			expect( posted ).toEqual( [
				{ type: 'notice', text: 'Not a Marp document' },
			] )
		);
	} );

	it( 'points local images at the webview', async () => {
		addWorkspaceFolder( '/workspace' );
		const { send, posted } = openPreview(
			'---\nmarp: true\n---\n\n![](images/a.png)\n\n![bg](https://example.com/b.png)\n'
		);

		send( { type: 'ready' } );

		await vi.waitFor( () => expect( posted ).toHaveLength( 1 ) );
		const [ message ] = posted;
		expect( message.type === 'slides' && message.html ).toContain(
			'src="webview:file:///workspace/docs/images/a.png"'
		);
		expect( message.type === 'slides' && message.html ).toContain(
			'https://example.com/b.png'
		);
	} );

	it( 'allows the webview to load from the bundle and the image folders', () => {
		addWorkspaceFolder( '/workspace' );
		const { panel } = openPreview();

		const roots = (
			panel.webview.options as vscode.WebviewOptions
		 ).localResourceRoots?.map( ( uri ) => uri.toString() );

		expect( roots ).toEqual( [
			'file:///extension/dist/preview',
			'file:///workspace/docs',
			'file:///workspace',
		] );
	} );

	it( 'renders again once edits settle', async () => {
		const { document, send, posted } = openPreview();
		send( { type: 'ready' } );
		await vi.waitFor( () => expect( posted ).toHaveLength( 1 ) );

		document.setText( `${ DECK }\n---\n\n# Three\n` );
		document.setText( `${ DECK }\n---\n\n# Three\n\n---\n\n# Four\n` );
		expect( posted ).toHaveLength( 1 );

		await vi.waitFor( () => expect( posted ).toHaveLength( 2 ) );
		const message = posted[ 1 ];
		expect(
			message.type === 'slides' &&
				message.html.match( /<svg data-marpit-svg/g )
		).toHaveLength( 4 );
	} );

	it( 'ignores edits before the webview is ready', async () => {
		const { document, posted } = openPreview();

		document.setText( `${ DECK }\n---\n\n# Three\n` );

		await new Promise( ( resolve ) => setTimeout( resolve, 200 ) );
		expect( posted ).toEqual( [] );
	} );

	it( 'reports how many slides the webview shows', () => {
		const { document, send, close } = openPreview();

		expect( MarpPreviewProvider.getSlideCount( document.uri ) ).toBe(
			null
		);
		send( { type: 'rendered', slideCount: 2 } );
		expect( MarpPreviewProvider.getSlideCount( document.uri ) ).toBe( 2 );

		close();
		expect( MarpPreviewProvider.getSlideCount( document.uri ) ).toBe(
			null
		);
	} );

	it( 'stops listening to the workspace when closed', () => {
		const { close } = openPreview();

		close();

		expect( getListenerCount() ).toBe( 0 );
	} );
} );
