/**
 * External dependencies
 */
import * as path from 'node:path';
import * as vscode from 'vscode';

/**
 * Internal dependencies
 */
import type { HostMessage, WebviewMessage } from '../shared/messages';
import { CONFIGURATION_SECTION, readSettings, writeSetting } from './settings';
import { getHtmlForWebview } from './webview-html';

const CHANGE_DEBOUNCE_MS = 200;
const FLUSH_TIMEOUT_MS = 1000;

const IMAGE_EXTENSIONS = [
	'png',
	'jpg',
	'jpeg',
	'gif',
	'webp',
	'svg',
	'avif',
	'bmp',
];

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

	private readonly extensionId: string;

	// Folders the webview may load local images from.
	private readonly imageRoots: vscode.Uri[];

	private flushSeq = 0;
	private isReady = false;
	private isDisposed = false;

	public constructor(
		context: vscode.ExtensionContext,
		private readonly document: vscode.TextDocument,
		private readonly panel: vscode.WebviewPanel
	) {
		this.extensionId = context.extension.id;

		const webviewRoot = vscode.Uri.joinPath(
			context.extensionUri,
			'dist',
			'webview'
		);

		// Beyond the bundle, allow the folders local images are resolved
		// against (see `resolveImageSrc`).
		this.imageRoots = [
			vscode.Uri.joinPath( document.uri, '..' ),
			...( vscode.workspace.workspaceFolders ?? [] ).map(
				( folder ) => folder.uri
			),
		];
		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [ webviewRoot, ...this.imageRoots ],
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
			),
			vscode.workspace.onDidChangeConfiguration( ( event ) =>
				this.onConfigurationChanged( event )
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
				this.post( {
					type: 'init',
					text: this.document.getText(),
					settings: readSettings( this.document.uri ),
				} );
				break;

			case 'change':
				this.pendingText = message.text;
				this.restartChangeTimer();
				break;

			case 'openSettings':
				void vscode.commands.executeCommand(
					'workbench.action.openSettings',
					`@ext:${ this.extensionId }`
				);
				break;

			case 'updateSetting':
				void writeSetting(
					this.document.uri,
					message.key,
					message.value
				);
				break;

			case 'resolveImage':
				this.post( {
					type: 'resolveImage:done',
					requestId: message.requestId,
					src: this.resolveImageSrc( message.path ),
				} );
				break;

			case 'checkImage':
				this.post( {
					type: 'checkImage:done',
					requestId: message.requestId,
					isDisplayable: this.isDisplayableImage( message.path ),
				} );
				break;

			case 'pickImage':
				void this.pickImageFile().then( ( pickedPath ) =>
					this.post( {
						type: 'pickImage:done',
						requestId: message.requestId,
						path: pickedPath,
					} )
				);
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

	// Opens a file picker for an image and returns its absolute path, as the
	// Tauri app does.
	private async pickImageFile(): Promise< string | null > {
		const [ picked ] =
			( await vscode.window.showOpenDialog( {
				canSelectMany: false,
				defaultUri:
					this.document.uri.scheme === 'file'
						? vscode.Uri.joinPath( this.document.uri, '..' )
						: undefined,
				filters: {
					[ vscode.l10n.t( 'Images' ) ]: IMAGE_EXTENSIONS,
				},
			} ) ) ?? [];
		return picked ? picked.fsPath : null;
	}

	// Maps an image path from the markdown to a URL the webview can load.
	private resolveImageSrc( src: string ): string {
		const uri = this.resolveImageUri( src );
		return uri ? this.panel.webview.asWebviewUri( uri ).toString() : src;
	}

	// Whether the webview can load the image, i.e. it is remote or inside one
	// of `imageRoots`.
	private isDisplayableImage( src: string ): boolean {
		const uri = this.resolveImageUri( src );
		if ( ! uri ) {
			return true;
		}
		return this.imageRoots.some( ( root ) => {
			if ( root.scheme !== uri.scheme ) {
				return false;
			}
			const relative = path.relative( root.fsPath, uri.fsPath );
			return (
				! relative.startsWith( '..' ) && ! path.isAbsolute( relative )
			);
		} );
	}

	// Resolves an image path from the markdown to the file it points to:
	// relative paths against the document, `/`-rooted ones against its
	// workspace folder (as the built-in markdown preview does), and absolute
	// file system paths as is. Returns `null` for URLs the webview loads
	// directly.
	private resolveImageUri( src: string ): vscode.Uri | null {
		if ( /^(https?:|data:|blob:)/i.test( src ) ) {
			return null;
		}

		let target = src.replace( /[?#].*$/, '' );
		try {
			target = decodeURI( target );
		} catch {
			// Not percent-encoded; use it verbatim.
		}

		if ( /^file:/i.test( target ) ) {
			return vscode.Uri.parse( target );
		}
		const folder = vscode.workspace.getWorkspaceFolder( this.document.uri );
		if ( target.startsWith( '/' ) && folder ) {
			return vscode.Uri.joinPath( folder.uri, target );
		}
		if ( path.isAbsolute( target ) ) {
			return vscode.Uri.file( target );
		}
		return vscode.Uri.joinPath( this.document.uri, '..', target );
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

	private onConfigurationChanged(
		event: vscode.ConfigurationChangeEvent
	): void {
		if (
			! this.isReady ||
			! event.affectsConfiguration(
				CONFIGURATION_SECTION,
				this.document.uri
			)
		) {
			return;
		}
		this.post( {
			type: 'settings',
			settings: readSettings( this.document.uri ),
		} );
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
