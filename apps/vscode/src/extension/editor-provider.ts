/**
 * External dependencies
 */
import * as vscode from 'vscode';

/**
 * Internal dependencies
 */
import type { HostMessage, WebviewMessage } from '../shared/messages';
import { getHtmlForWebview } from './webview-html';

// Merges a burst of edits into a single document write.
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
					// Booting the block editor is expensive; keep it alive off-screen.
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

/** One open visual editor: the webview, its document, and the sync between them. */
class EditorSession {
	private readonly disposables: vscode.Disposable[] = [];
	private readonly pendingFlushes = new Map< number, () => void >();

	private pendingText: string | null = null;
	private changeTimer: ReturnType< typeof setTimeout > | undefined;

	// Dropped instead of echoed to the webview, which would reparse the
	// markdown and lose the selection.
	private lastAppliedText: string | null = null;

	private flushSeq = 0;
	private isReady = false;

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

		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [ webviewRoot ],
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

	private onDocumentChanged( event: vscode.TextDocumentChangeEvent ): void {
		if ( ! this.isOwnDocument( event.document ) ) {
			return;
		}
		if ( event.contentChanges.length === 0 ) {
			return;
		}

		const text = event.document.getText();
		if ( text === this.lastAppliedText ) {
			return;
		}

		// Whatever the webview was about to write is now based on a stale tree.
		this.cancelChangeTimer();
		this.pendingText = null;
		this.post( { type: 'update', text } );
	}

	private onWillSave( event: vscode.TextDocumentWillSaveEvent ): void {
		if ( ! this.isOwnDocument( event.document ) ) {
			return;
		}
		// The webview can't intercept Ctrl+S itself, so without this a save
		// within the debounce window would silently drop the last keystrokes.
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
		this.lastAppliedText = text;
		await vscode.workspace.applyEdit( edit );
	}

	/** Claims the text waiting to be written, or `null` when there is none. */
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
		this.cancelChangeTimer();
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
