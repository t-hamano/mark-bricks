/**
 * External dependencies
 */
import * as vscode from 'vscode';
import { isMarpDocument } from '@mark-bricks/editor/marp';

/**
 * Internal dependencies
 */
import type {
	PreviewHostMessage,
	PreviewWebviewMessage,
} from '../shared/messages';
import { getImageRoots, resolveImageUri } from './images';
import { getHtmlForPreview } from './preview-html';

// How long edits are collected before the slides are rendered again.
const RENDER_DELAY_MS = 100;

let marpPreview: Promise<
	typeof import( '@mark-bricks/marp-preview' )
> | null = null;

// Loads Marp on the first render, since the extension activates for every
// markdown file.
function loadMarpPreview() {
	marpPreview ??= import( '@mark-bricks/marp-preview' );
	return marpPreview;
}

// Shows the slides of a Marp slide deck, updated as the document changes.
export class MarpPreviewProvider implements vscode.CustomTextEditorProvider {
	public static readonly viewType = 'markBricks.marpPreview';

	// URIs of the open documents whose preview has rendered, with the number
	// of slides it shows.
	private static readonly slideCounts = new Map< string, number >();

	// Registers the provider for the `viewType` custom editor.
	public static register(
		context: vscode.ExtensionContext
	): vscode.Disposable {
		return vscode.window.registerCustomEditorProvider(
			MarpPreviewProvider.viewType,
			new MarpPreviewProvider( context ),
			{
				webviewOptions: {
					retainContextWhenHidden: true,
				},
				supportsMultipleEditorsPerDocument: false,
			}
		);
	}

	// How many slides the document's preview shows, or `null` before it has
	// rendered.
	public static getSlideCount( uri: vscode.Uri ): number | null {
		return MarpPreviewProvider.slideCounts.get( uri.toString() ) ?? null;
	}

	private constructor( private readonly context: vscode.ExtensionContext ) {}

	// Starts a preview session for each opened document.
	public resolveCustomTextEditor(
		document: vscode.TextDocument,
		panel: vscode.WebviewPanel
	): void {
		const key = document.uri.toString();
		void new PreviewSession(
			this.context,
			document,
			panel,
			( slideCount ) => {
				if ( slideCount === null ) {
					MarpPreviewProvider.slideCounts.delete( key );
				} else {
					MarpPreviewProvider.slideCounts.set( key, slideCount );
				}
			}
		);
	}
}

// Connects one document to its preview: renders the slides and sends them
// again whenever the document changes.
class PreviewSession {
	private readonly disposables: vscode.Disposable[] = [];

	private renderTimer: ReturnType< typeof setTimeout > | undefined;

	private isReady = false;
	private isDisposed = false;

	public constructor(
		context: vscode.ExtensionContext,
		private readonly document: vscode.TextDocument,
		private readonly panel: vscode.WebviewPanel,
		// Called with null when the webview is gone.
		private readonly onSlideCountChange: (
			slideCount: number | null
		) => void
	) {
		const previewRoot = vscode.Uri.joinPath(
			context.extensionUri,
			'dist',
			'preview'
		);
		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				previewRoot,
				...getImageRoots( document.uri ),
			],
		};
		panel.webview.html = getHtmlForPreview( panel.webview, previewRoot );

		this.disposables.push(
			panel.webview.onDidReceiveMessage(
				( message: PreviewWebviewMessage ) =>
					this.onWebviewMessage( message )
			),
			vscode.workspace.onDidChangeTextDocument( ( event ) =>
				this.onDocumentChanged( event )
			)
		);

		panel.onDidDispose( () => this.dispose() );
	}

	// Handles a message from the webview.
	private onWebviewMessage( message: PreviewWebviewMessage ): void {
		switch ( message.type ) {
			case 'ready':
				this.isReady = true;
				void this.render();
				break;

			case 'rendered':
				this.onSlideCountChange( message.slideCount );
				break;
		}
	}

	// Renders the slides again once the edits in progress settle.
	private onDocumentChanged( event: vscode.TextDocumentChangeEvent ): void {
		if (
			! this.isReady ||
			event.document.uri.toString() !== this.document.uri.toString() ||
			this.renderTimer !== undefined
		) {
			return;
		}
		this.renderTimer = setTimeout( () => {
			this.renderTimer = undefined;
			void this.render();
		}, RENDER_DELAY_MS );
	}

	// Sends the document's slides to the webview, or a notice when the
	// document is not a Marp slide deck.
	private async render(): Promise< void > {
		const markdown = this.document.getText();
		if ( ! isMarpDocument( markdown ) ) {
			this.post( {
				type: 'notice',
				text: vscode.l10n.t( 'Not a Marp document' ),
			} );
			return;
		}
		const { renderSlides } = await loadMarpPreview();
		if ( this.isDisposed ) {
			return;
		}
		const { html, css } = renderSlides( markdown, {
			resolveImageSrc: ( src ) => {
				const uri = resolveImageUri( src, this.document.uri );
				return uri
					? this.panel.webview.asWebviewUri( uri ).toString()
					: null;
			},
		} );
		this.post( { type: 'slides', html, css } );
	}

	// Sends a message to the webview.
	private post( message: PreviewHostMessage ): void {
		void this.panel.webview.postMessage( message );
	}

	// Releases the session's resources.
	private dispose(): void {
		this.isDisposed = true;
		this.onSlideCountChange( null );
		if ( this.renderTimer !== undefined ) {
			clearTimeout( this.renderTimer );
			this.renderTimer = undefined;
		}
		for ( const disposable of this.disposables ) {
			disposable.dispose();
		}
		this.disposables.length = 0;
	}
}
