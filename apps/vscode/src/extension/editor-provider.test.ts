/**
 * External dependencies
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';

/**
 * Internal dependencies
 */
import type { HostMessage, WebviewMessage } from '../shared/messages';
import { DEFAULT_SETTINGS } from '../shared/settings';
import {
	EventEmitter,
	TextEdit,
	Uri,
	addWorkspaceFolder,
	commands,
	configurationUpdate,
	createDocument,
	fireConfigurationChange,
	fireWillSave,
	getCustomEditorProvider,
	getListenerCount,
	resetVscode,
	window,
	workspace,
} from './__mocks__/vscode';
import { MarkBricksEditorProvider } from './editor-provider';

const EXTENSION_ID = 'aki-hamano.mark-bricks-vscode';
const DOCUMENT_PATH = '/workspace/docs/note.md';

/**
 * Opens a document in the visual editor, returning handles to play the
 * webview's side of the conversation.
 *
 * @param text Initial document text.
 */
function openEditor( text = '# Hello' ) {
	const context = {
		extension: { id: EXTENSION_ID },
		extensionUri: Uri.file( '/extension' ),
	};
	MarkBricksEditorProvider.register(
		context as unknown as vscode.ExtensionContext
	);
	const provider = getCustomEditorProvider(
		MarkBricksEditorProvider.viewType
	) as vscode.CustomTextEditorProvider;

	const document = createDocument( DOCUMENT_PATH, text );
	const messages = new EventEmitter< WebviewMessage >();
	const disposed = new EventEmitter< void >();
	const posted: HostMessage[] = [];
	const panel = {
		webview: {
			options: {},
			html: '',
			cspSource: 'vscode-webview:',
			onDidReceiveMessage: messages.event,
			postMessage: async ( message: HostMessage ) => {
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
		send: ( message: WebviewMessage ) => messages.fire( message ),
		close: () => disposed.fire(),
	};
}

beforeEach( () => {
	resetVscode();
	vi.useFakeTimers();
} );

afterEach( () => {
	vi.useRealTimers();
} );

describe( 'webview messages', () => {
	it( 'sends the document and settings once the webview is ready', () => {
		const { send, posted } = openEditor( '# Title' );

		send( { type: 'ready' } );

		expect( posted ).toEqual( [
			{ type: 'init', text: '# Title', settings: DEFAULT_SETTINGS },
		] );
	} );

	it( 'opens the extension settings', () => {
		const { send } = openEditor();

		send( { type: 'openSettings' } );

		expect( commands.executeCommand ).toHaveBeenCalledWith(
			'workbench.action.openSettings',
			`@ext:${ EXTENSION_ID }`
		);
	} );

	it( 'writes settings changed from the webview', () => {
		const { send } = openEditor();

		send( { type: 'updateSetting', key: 'topToolbar', value: true } );

		expect( configurationUpdate ).toHaveBeenCalledWith(
			'topToolbar',
			true,
			expect.anything()
		);
	} );
} );

describe( 'webview edits', () => {
	it( 'debounces edits into a single document edit', async () => {
		const { send, document } = openEditor();

		send( { type: 'change', text: 'a' } );
		await vi.advanceTimersByTimeAsync( 199 );
		send( { type: 'change', text: 'ab' } );
		await vi.advanceTimersByTimeAsync( 199 );
		expect( workspace.applyEdit ).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync( 1 );
		expect( workspace.applyEdit ).toHaveBeenCalledTimes( 1 );
		expect( document.getText() ).toBe( 'ab' );
	} );

	it( 'skips edits that leave the text unchanged', async () => {
		const { send } = openEditor( 'same' );

		send( { type: 'change', text: 'same' } );
		await vi.advanceTimersByTimeAsync( 200 );

		expect( workspace.applyEdit ).not.toHaveBeenCalled();
	} );

	it( 'keeps a rejected edit for the next save and reports it', async () => {
		workspace.applyEdit.mockResolvedValueOnce( false );
		const { send, document } = openEditor();

		send( { type: 'change', text: 'edited' } );
		await vi.advanceTimersByTimeAsync( 200 );

		expect( window.showErrorMessage ).toHaveBeenCalledWith(
			`MarkBricks could not apply edits to ${ DOCUMENT_PATH }.`
		);
		const [ pending ] = fireWillSave( document );
		expect( await pending ).toEqual( [
			TextEdit.replace( expect.anything(), 'edited' ),
		] );
	} );
} );

describe( 'external edits', () => {
	it( 'forwards edits made outside the webview', () => {
		const { document, posted } = openEditor();

		document.setText( 'from the text editor' );

		expect( posted ).toEqual( [
			{ type: 'update', text: 'from the text editor' },
		] );
	} );

	it( 'drops pending webview edits in favor of an external edit', async () => {
		const { send, document, posted } = openEditor();

		send( { type: 'change', text: 'from the webview' } );
		document.setText( 'from the text editor' );
		await vi.advanceTimersByTimeAsync( 200 );

		expect( workspace.applyEdit ).not.toHaveBeenCalled();
		expect( document.getText() ).toBe( 'from the text editor' );
		expect( posted ).toEqual( [
			{ type: 'update', text: 'from the text editor' },
		] );
	} );

	it( 'ignores changes to other documents', () => {
		const { posted } = openEditor();

		createDocument( '/workspace/other.md', '' ).setText( 'other' );

		expect( posted ).toEqual( [] );
	} );
} );

describe( 'saving', () => {
	it( 'flushes the webview and saves its latest text', async () => {
		const { send, document, posted } = openEditor();
		send( { type: 'ready' } );
		posted.length = 0;

		send( { type: 'change', text: 'typed' } );
		const [ pending ] = fireWillSave( document );
		expect( posted ).toEqual( [ { type: 'flush', requestId: 1 } ] );

		send( { type: 'change', text: 'typed more' } );
		send( { type: 'flush:done', requestId: 1 } );
		expect( await pending ).toEqual( [
			TextEdit.replace( expect.anything(), 'typed more' ),
		] );

		// VS Code applies the returned edit, which is not echoed back.
		document.setText( 'typed more' );
		expect( posted ).toEqual( [ { type: 'flush', requestId: 1 } ] );
		expect( workspace.applyEdit ).not.toHaveBeenCalled();
	} );

	it( 'saves without the flush when the webview does not answer', async () => {
		const { send, document } = openEditor();
		send( { type: 'ready' } );

		const onSettled = vi.fn();
		const [ pending ] = fireWillSave( document );
		void pending.then( onSettled );

		await vi.advanceTimersByTimeAsync( 999 );
		expect( onSettled ).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync( 1 );
		expect( onSettled ).toHaveBeenCalledWith( [] );
	} );

	it( 'does not wait for a webview that is not ready', async () => {
		const { document, posted } = openEditor();

		const [ pending ] = fireWillSave( document );

		expect( await pending ).toEqual( [] );
		expect( posted ).toEqual( [] );
	} );

	it( 'ignores saves of other documents', () => {
		openEditor();

		expect(
			fireWillSave( createDocument( '/workspace/other.md', '' ) )
		).toEqual( [] );
	} );
} );

describe( 'settings changes', () => {
	it( 'sends settings when they change', () => {
		const { send, posted } = openEditor();
		send( { type: 'ready' } );
		posted.length = 0;

		fireConfigurationChange( [ 'markBricks' ] );

		expect( posted ).toEqual( [
			{ type: 'settings', settings: DEFAULT_SETTINGS },
		] );
	} );

	it( 'ignores changes before the webview is ready', () => {
		const { posted } = openEditor();

		fireConfigurationChange( [ 'markBricks' ] );

		expect( posted ).toEqual( [] );
	} );

	it( 'ignores changes to other settings', () => {
		const { send, posted } = openEditor();
		send( { type: 'ready' } );
		posted.length = 0;

		fireConfigurationChange( [ 'editor' ] );

		expect( posted ).toEqual( [] );
	} );
} );

describe( 'closing', () => {
	it( 'writes pending edits without waiting for the debounce', async () => {
		const { send, document, close } = openEditor();

		send( { type: 'change', text: 'unsaved' } );
		close();
		await vi.advanceTimersByTimeAsync( 0 );

		expect( document.getText() ).toBe( 'unsaved' );
	} );

	it( 'releases a save waiting for the flush', async () => {
		const { send, document, close } = openEditor();
		send( { type: 'ready' } );

		const [ pending ] = fireWillSave( document );
		close();

		expect( await pending ).toEqual( [] );
	} );

	it( 'stops listening to the workspace', () => {
		const { close } = openEditor();

		close();

		expect( getListenerCount() ).toBe( 0 );
	} );
} );

describe( 'image paths', () => {
	it( 'allows the webview to load from the document and workspace folders', () => {
		addWorkspaceFolder( '/workspace' );
		const { panel } = openEditor();

		const roots = (
			panel.webview.options as vscode.WebviewOptions
		 ).localResourceRoots?.map( ( uri ) => uri.toString() );

		expect( roots ).toEqual( [
			'file:///extension/dist/webview',
			'file:///workspace/docs',
			'file:///workspace',
		] );
	} );

	it.each( [
		[ 'images/a.png', 'webview:file:///workspace/docs/images/a.png' ],
		[ '../a.png', 'webview:file:///workspace/a.png' ],
		[ '/assets/a.png', 'webview:file:///workspace/assets/a.png' ],
		[ 'file:///tmp/a.png', 'webview:file:///tmp/a.png' ],
		[
			'images/my%20photo.png?v=1#top',
			'webview:file:///workspace/docs/images/my photo.png',
		],
		[ 'bad%E0%A4%A.png', 'webview:file:///workspace/docs/bad%E0%A4%A.png' ],
		[ 'https://example.com/a.png', 'https://example.com/a.png' ],
		[ 'data:image/png;base64,AAAA', 'data:image/png;base64,AAAA' ],
	] )( 'resolves %s', ( path, src ) => {
		addWorkspaceFolder( '/workspace' );
		const { send, posted } = openEditor();

		send( { type: 'resolveImage', requestId: 7, path } );

		expect( posted ).toEqual( [
			{ type: 'resolveImage:done', requestId: 7, src },
		] );
	} );

	it( 'treats a /-rooted path outside a workspace as absolute', () => {
		const { send, posted } = openEditor();

		send( { type: 'resolveImage', requestId: 1, path: '/tmp/a.png' } );

		expect( posted ).toEqual( [
			{
				type: 'resolveImage:done',
				requestId: 1,
				src: 'webview:file:///tmp/a.png',
			},
		] );
	} );

	it.each( [
		[ 'images/a.png', null ],
		[ '/assets/a.png', null ],
		[ '..assets/a.png', null ],
		[ '../../a.png', 'outsideRoots' ],
		[ 'file:///tmp/a.png', 'outsideRoots' ],
		[ 'https://example.com/a.png', null ],
		[ 'http://example.com/a.png', 'insecureUrl' ],
	] )( 'checks whether %s can be displayed', ( path, error ) => {
		addWorkspaceFolder( '/workspace' );
		const { send, posted } = openEditor();

		send( { type: 'checkImage', requestId: 3, path } );

		expect( posted ).toEqual( [
			{ type: 'checkImage:done', requestId: 3, error },
		] );
	} );

	it( 'picks an image file next to the document', async () => {
		window.showOpenDialog.mockResolvedValueOnce( [
			Uri.file( '/workspace/docs/images/a.png' ),
		] );
		const { send, posted } = openEditor();

		send( { type: 'pickImage', requestId: 5 } );
		await vi.advanceTimersByTimeAsync( 0 );

		expect( window.showOpenDialog ).toHaveBeenCalledWith(
			expect.objectContaining( {
				canSelectMany: false,
				defaultUri: Uri.file( '/workspace/docs' ),
				filters: { Images: expect.arrayContaining( [ 'png' ] ) },
			} )
		);
		expect( posted ).toEqual( [
			{
				type: 'pickImage:done',
				requestId: 5,
				path: '/workspace/docs/images/a.png',
			},
		] );
	} );

	it( 'answers null when the image picker is canceled', async () => {
		window.showOpenDialog.mockResolvedValueOnce( undefined );
		const { send, posted } = openEditor();

		send( { type: 'pickImage', requestId: 5 } );
		await vi.advanceTimersByTimeAsync( 0 );

		expect( posted ).toEqual( [
			{ type: 'pickImage:done', requestId: 5, path: null },
		] );
	} );
} );
