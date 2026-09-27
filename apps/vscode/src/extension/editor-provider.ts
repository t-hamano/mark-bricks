/**
 * External dependencies
 */
import * as path from 'node:path';
import * as vscode from 'vscode';

/**
 * Internal dependencies
 */
import type {
	HostMessage,
	ImageError,
	WebviewMessage,
} from '../shared/messages';
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

// Opens markdown documents in the MarkBricks block editor.
export class MarkBricksEditorProvider
	implements vscode.CustomTextEditorProvider
{
	public static readonly viewType = 'markBricks.visualEditor';

	// URIs of the open documents whose webview has posted `rendered`.
	private static readonly renderedDocuments = new Set< string >();

	// Registers the provider for the `viewType` custom editor.
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

	// Whether the document's webview shows its blocks in the editor canvas.
	public static isEditorRendered( uri: vscode.Uri ): boolean {
		return MarkBricksEditorProvider.renderedDocuments.has( uri.toString() );
	}

	private constructor( private readonly context: vscode.ExtensionContext ) {}

	// Starts an editor session for each opened document.
	public resolveCustomTextEditor(
		document: vscode.TextDocument,
		panel: vscode.WebviewPanel
	): void {
		const key = document.uri.toString();
		void new EditorSession(
			this.context,
			document,
			panel,
			( isRendered ) => {
				if ( isRendered ) {
					MarkBricksEditorProvider.renderedDocuments.add( key );
				} else {
					MarkBricksEditorProvider.renderedDocuments.delete( key );
				}
			}
		);
	}
}

// Connects one document to its webview: syncs the text both ways, sends the
// settings, and resolves images for the webview.
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
		private readonly panel: vscode.WebviewPanel,
		private readonly onRenderedChange: ( isRendered: boolean ) => void
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

	// Sends a message to the webview.
	private post( message: HostMessage ): void {
		void this.panel.webview.postMessage( message );
	}

	// Handles a message from the webview.
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

			case 'rendered':
				this.onRenderedChange( true );
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
					error: this.getImageError( message.path ),
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

	// Why the webview cannot load the image, or `null` if it can. The CSP
	// blocks `http:` URLs, and local images must be inside one of
	// `imageRoots`. Image path -> relative path from root `/project`:
	// - `/` -> `..` (outside)
	// - `/other/image.png` -> `../other/image.png` (outside)
	// - `D:\image.png` (root `C:\project`) -> `D:\image.png` (outside)
	// - `/project/..assets/image.png` -> `..assets/image.png` (inside)
	private getImageError( src: string ): ImageError | null {
		if ( /^http:/i.test( src ) ) {
			return 'insecureUrl';
		}
		const uri = this.resolveImageUri( src );
		if ( ! uri ) {
			return null;
		}
		const isInsideRoots = this.imageRoots.some( ( root ) => {
			if ( root.scheme !== uri.scheme ) {
				return false;
			}
			const relative = path.relative( root.fsPath, uri.fsPath );
			return (
				relative !== '..' &&
				! relative.startsWith( `..${ path.sep }` ) &&
				! path.isAbsolute( relative )
			);
		} );
		return isInsideRoots ? null : 'outsideRoots';
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

	// Sends changes made outside the webview, e.g. in a text editor, to the
	// webview. Changes applied from the webview itself are skipped.
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

	// Sends the settings to the webview when they change.
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

	// Adds the edits the webview has not written yet to the save.
	private onWillSave( event: vscode.TextDocumentWillSaveEvent ): void {
		if ( ! this.isOwnDocument( event.document ) ) {
			return;
		}
		event.waitUntil( this.collectPendingEdits() );
	}

	// Flushes the webview and returns its unwritten text as an edit.
	private async collectPendingEdits(): Promise< vscode.TextEdit[] > {
		await this.requestFlush();

		const text = this.takePending();
		if ( text === null ) {
			return [];
		}

		this.lastAppliedText = text;
		return [ vscode.TextEdit.replace( this.fullRange(), text ) ];
	}

	// Asks the webview to send its latest text, giving up after a timeout.
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

	// Writes the pending text from the webview to the document.
	private async writePending(): Promise< void > {
		const text = this.takePending();
		if ( text === null ) {
			return;
		}

		const edit = new vscode.WorkspaceEdit();
		edit.replace( this.document.uri, this.fullRange(), text );
		// VS Code fires the change event before `applyEdit` resolves, so the
		// text to skip must be set beforehand.
		this.lastAppliedText = text;
		const applied = await vscode.workspace.applyEdit( edit );
		if ( applied ) {
			return;
		}

		// A rejected edit fires no change event to consume it.
		if ( this.lastAppliedText === text ) {
			this.lastAppliedText = null;
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

	// Takes the pending text, or `null` if it matches the document.
	private takePending(): string | null {
		this.cancelChangeTimer();
		const text = this.pendingText;
		this.pendingText = null;
		return text === null || text === this.document.getText() ? null : text;
	}

	// Debounces writing the pending text to the document.
	private restartChangeTimer(): void {
		this.cancelChangeTimer();
		this.changeTimer = setTimeout( () => {
			this.changeTimer = undefined;
			void this.writePending();
		}, CHANGE_DEBOUNCE_MS );
	}

	// Stops a scheduled write of the pending text.
	private cancelChangeTimer(): void {
		if ( this.changeTimer !== undefined ) {
			clearTimeout( this.changeTimer );
			this.changeTimer = undefined;
		}
	}

	// Whether the document is the one this session edits.
	private isOwnDocument( document: vscode.TextDocument ): boolean {
		return document.uri.toString() === this.document.uri.toString();
	}

	// The range covering the whole document.
	private fullRange(): vscode.Range {
		return new vscode.Range(
			this.document.positionAt( 0 ),
			this.document.positionAt( this.document.getText().length )
		);
	}

	// Writes any pending text and releases the session's resources.
	private dispose(): void {
		this.isDisposed = true;
		this.onRenderedChange( false );
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
