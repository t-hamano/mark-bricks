/**
 * External dependencies
 */
import * as path from 'node:path';
import * as vscode from 'vscode';

/**
 * Internal dependencies
 */
import type { HostMessage, WebviewMessage } from '../shared/messages';
import { getHtmlForWebview } from './webview-html';

const CHANGE_DEBOUNCE_MS = 200;
const FLUSH_TIMEOUT_MS = 1000;

export class MarkBricksEditorProvider
	implements vscode.CustomTextEditorProvider
{
	public static readonly viewType = 'markBricks.visualEditor';

	public static register(
		context: vscode.ExtensionContext
	): vscode.Disposable {
		return vscode.window.registerCustomEditorProvider(
			MarkBricksEditorProvider.viewType,
			new MarkBricksEditorProvider( context ),
			{
				webviewOptions: {
					retainContextWhenHidden: true,
				},
				supportsMultipleEditorsPerDocument: false,
			}
		);
	}

	private constructor( private readonly context: vscode.ExtensionContext ) {}

	public resolveCustomTextEditor(
		document: vscode.TextDocument,
		panel: vscode.WebviewPanel
	): void {
		void new EditorSession( this.context, document, panel );
	}
}

class EditorSession {
	private readonly disposables: vscode.Disposable[] = [];
	private readonly pendingFlushes = new Map< number, () => void >();

	private pendingText: string | null = null;
	private changeTimer: ReturnType< typeof setTimeout > | undefined;

	private lastAppliedText: string | null = null;

	private flushSeq = 0;
	private isReady = false;
	private isDisposed = false;

	public constructor(
		context: vscode.ExtensionContext,
		private readonly document: vscode.TextDocument,
		private readonly panel: vscode.WebviewPanel
	) {
		const webviewRoot = vscode.Uri.joinPath(
			context.extensionUri,
			'dist',
			'webview'
		);

		// Beyond the bundle, allow the folders local images are resolved
		// against (see `resolveImageSrc`).
		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				webviewRoot,
				vscode.Uri.joinPath( document.uri, '..' ),
				...( vscode.workspace.workspaceFolders ?? [] ).map(
					( folder ) => folder.uri
				),
			],
		};
		panel.webview.html = getHtmlForWebview( panel.webview, webviewRoot );

		this.disposables.push(
			panel.webview.onDidReceiveMessage( ( message: WebviewMessage ) =>
				this.onWebviewMessage( message )
			),
			vscode.workspace.onDidChangeTextDocument( ( event ) =>
				this.onDocumentChanged( event )
			),
			vscode.workspace.onWillSaveTextDocument( ( event ) =>
				this.onWillSave( event )
			)
		);

		panel.onDidDispose( () => this.dispose() );
	}

	private post( message: HostMessage ): void {
		void this.panel.webview.postMessage( message );
	}

	private onWebviewMessage( message: WebviewMessage ): void {
		switch ( message.type ) {
			case 'ready':
				this.isReady = true;
				this.post( { type: 'init', text: this.document.getText() } );
				break;

			case 'change':
				this.pendingText = message.text;
				this.restartChangeTimer();
				break;

			case 'resolveImage':
				this.post( {
					type: 'resolveImage:done',
					requestId: message.requestId,
					src: this.resolveImageSrc( message.path ),
				} );
				break;

			case 'flush:done': {
				const resolve = this.pendingFlushes.get( message.requestId );
				if ( resolve ) {
					this.pendingFlushes.delete( message.requestId );
					resolve();
				}
				break;
			}
		}
	}

	// Maps an image path from the markdown to a URL the webview can load:
	// relative paths against the document, `/`-rooted ones against its
	// workspace folder (as the built-in markdown preview does), and absolute
	// file system paths as is.
	private resolveImageSrc( src: string ): string {
		if ( /^(https?:|data:|blob:)/i.test( src ) ) {
			return src;
		}

		let target = src.replace( /[?#].*$/, '' );
		try {
			target = decodeURI( target );
		} catch {
			// Not percent-encoded; use it verbatim.
		}

		let uri: vscode.Uri;
		const folder = vscode.workspace.getWorkspaceFolder( this.document.uri );
		if ( /^file:/i.test( target ) ) {
			uri = vscode.Uri.parse( target );
		} else if ( target.startsWith( '/' ) && folder ) {
			uri = vscode.Uri.joinPath( folder.uri, target );
		} else if ( path.isAbsolute( target ) ) {
			uri = vscode.Uri.file( target );
		} else {
			uri = vscode.Uri.joinPath( this.document.uri, '..', target );
		}
		return this.panel.webview.asWebviewUri( uri ).toString();
	}

	private onDocumentChanged( event: vscode.TextDocumentChangeEvent ): void {
		if ( ! this.isOwnDocument( event.document ) ) {
			return;
		}
		if ( event.contentChanges.length === 0 ) {
			return;
		}

		const text = event.document.getText();
		const expected = this.lastAppliedText;
		this.lastAppliedText = null;
		if ( text === expected ) {
			return;
		}

		this.cancelChangeTimer();
		this.pendingText = null;
		this.post( { type: 'update', text } );
	}

	private onWillSave( event: vscode.TextDocumentWillSaveEvent ): void {
		if ( ! this.isOwnDocument( event.document ) ) {
			return;
		}
		event.waitUntil( this.collectPendingEdits() );
	}

	private async collectPendingEdits(): Promise< vscode.TextEdit[] > {
		await this.requestFlush();

		const text = this.takePending();
		if ( text === null ) {
			return [];
		}

		this.lastAppliedText = text;
		return [ vscode.TextEdit.replace( this.fullRange(), text ) ];
	}

	private requestFlush(): Promise< void > {
		if ( ! this.isReady ) {
			return Promise.resolve();
		}

		const requestId = ++this.flushSeq;
		return new Promise< void >( ( resolve ) => {
			this.pendingFlushes.set( requestId, resolve );
			this.post( { type: 'flush', requestId } );
			setTimeout( () => {
				if ( this.pendingFlushes.delete( requestId ) ) {
					resolve();
				}
			}, FLUSH_TIMEOUT_MS );
		} );
	}

	private async writePending(): Promise< void > {
		const text = this.takePending();
		if ( text === null ) {
			return;
		}

		const edit = new vscode.WorkspaceEdit();
		edit.replace( this.document.uri, this.fullRange(), text );
		const applied = await vscode.workspace.applyEdit( edit );
		if ( applied ) {
			this.lastAppliedText = text;
			return;
		}

		// A rejected edit (e.g. a read-only document) would just be rejected
		// again, so keep the text for the next change or save rather than
		// retrying on a timer that could also outlive a disposed session.
		if ( ! this.isDisposed && this.pendingText === null ) {
			this.pendingText = text;
		}
		void vscode.window.showErrorMessage(
			vscode.l10n.t(
				'MarkBricks could not apply edits to {0}.',
				vscode.workspace.asRelativePath( this.document.uri )
			)
		);
	}

	private takePending(): string | null {
		this.cancelChangeTimer();
		const text = this.pendingText;
		this.pendingText = null;
		return text === null || text === this.document.getText() ? null : text;
	}

	private restartChangeTimer(): void {
		this.cancelChangeTimer();
		this.changeTimer = setTimeout( () => {
			this.changeTimer = undefined;
			void this.writePending();
		}, CHANGE_DEBOUNCE_MS );
	}

	private cancelChangeTimer(): void {
		if ( this.changeTimer !== undefined ) {
			clearTimeout( this.changeTimer );
			this.changeTimer = undefined;
		}
	}

	private isOwnDocument( document: vscode.TextDocument ): boolean {
		return document.uri.toString() === this.document.uri.toString();
	}

	private fullRange(): vscode.Range {
		return new vscode.Range(
			this.document.positionAt( 0 ),
			this.document.positionAt( this.document.getText().length )
		);
	}

	private dispose(): void {
		this.isDisposed = true;
		const hasPendingWrite = this.pendingText !== null;
		this.cancelChangeTimer();
		if ( hasPendingWrite ) {
			void this.writePending();
		}

		for ( const resolve of this.pendingFlushes.values() ) {
			resolve();
		}
		this.pendingFlushes.clear();

		for ( const disposable of this.disposables ) {
			disposable.dispose();
		}
		this.disposables.length = 0;
	}
}
