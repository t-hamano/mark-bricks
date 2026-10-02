/**
 * External dependencies
 */
import * as path from 'node:path';
import * as vscode from 'vscode';
import { isMarpDocument } from '@mark-bricks/editor/marp';
import type { PreviewLabels } from '@mark-bricks/marp-preview';

/**
 * Internal dependencies
 */
import type {
	PreviewHostMessage,
	PreviewState,
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

// The text of the preview's controls, in VS Code's display language.
function getLabels(): PreviewLabels {
	return {
		enterSlideMode: vscode.l10n.t( 'Enter slide mode' ),
		exitSlideMode: vscode.l10n.t( 'Exit slide mode' ),
		exitSlideModeHint: vscode.l10n.t(
			'Press F or Escape to exit slide mode'
		),
		previousSlide: vscode.l10n.t( 'Previous slide' ),
		nextSlide: vscode.l10n.t( 'Next slide' ),
		slideNumber: vscode.l10n.t( 'Slide number' ),
	};
}

// The URI of the document a restored panel previews, from the state its
// webview saved.
function getStateUri( state: unknown ): vscode.Uri | null {
	const uri = ( state as Partial< PreviewState > | undefined )?.uri;
	return typeof uri === 'string' ? vscode.Uri.parse( uri ) : null;
}

// Shows the slides of a Marp slide deck in a webview panel, updated as the
// document changes. A panel rather than a custom editor, so the preview does
// not show up in "Reopen Editor With..." for every markdown file.
export class MarpPreview {
	public static readonly viewType = 'markBricks.marpPreview';

	// The open previews, by the URI of their document.
	private static readonly sessions = new Map< string, PreviewSession >();

	private static extensionUri: vscode.Uri;

	// Registers the serializer that restores the panels after a restart.
	public static register(
		context: vscode.ExtensionContext
	): vscode.Disposable {
		MarpPreview.extensionUri = context.extensionUri;
		return vscode.window.registerWebviewPanelSerializer(
			MarpPreview.viewType,
			{
				deserializeWebviewPanel: async ( panel, state ) => {
					const uri = getStateUri( state );
					if ( ! uri || MarpPreview.sessions.has( uri.toString() ) ) {
						panel.dispose();
						return;
					}
					let document: vscode.TextDocument;
					try {
						document =
							await vscode.workspace.openTextDocument( uri );
					} catch {
						// The document is gone.
						panel.dispose();
						return;
					}
					// Another panel may have restored it in the meantime.
					if ( MarpPreview.sessions.has( uri.toString() ) ) {
						panel.dispose();
						return;
					}
					MarpPreview.start( document, panel );
				},
			}
		);
	}

	// Opens the document's preview beside the active editor, keeping the
	// focus there, or reveals the preview if it is already open.
	public static async show( uri: vscode.Uri ): Promise< void > {
		if ( MarpPreview.revealOpen( uri ) ) {
			return;
		}
		const document = await vscode.workspace.openTextDocument( uri );
		// A call made while the document was opening may have opened the
		// preview already.
		if ( MarpPreview.revealOpen( uri ) ) {
			return;
		}
		const panel = vscode.window.createWebviewPanel(
			MarpPreview.viewType,
			'',
			{ viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
			{ retainContextWhenHidden: true }
		);
		MarpPreview.start( document, panel );
	}

	// How many slides the document's preview shows, or `null` when it is not
	// open or has not rendered yet.
	public static getSlideCount( uri: vscode.Uri ): number | null {
		return MarpPreview.sessions.get( uri.toString() )?.slideCount ?? null;
	}

	// Reveals the document's preview, returning whether it was open.
	private static revealOpen( uri: vscode.Uri ): boolean {
		const session = MarpPreview.sessions.get( uri.toString() );
		session?.reveal();
		return session !== undefined;
	}

	private static start(
		document: vscode.TextDocument,
		panel: vscode.WebviewPanel
	): void {
		const key = document.uri.toString();
		const session = new PreviewSession(
			MarpPreview.extensionUri,
			document,
			panel,
			() => {
				// Only forget the preview if it is still this one.
				if ( MarpPreview.sessions.get( key ) === session ) {
					MarpPreview.sessions.delete( key );
				}
			}
		);
		MarpPreview.sessions.set( key, session );
	}
}

// Connects one document to its preview panel: renders the slides and sends
// them again whenever the document changes.
class PreviewSession {
	private readonly disposables: vscode.Disposable[] = [];

	private renderTimer: ReturnType< typeof setTimeout > | undefined;

	private isReady = false;
	private isDisposed = false;

	// Counts the renders, so one that waited for Marp can tell a newer one
	// started meanwhile.
	private renderCount = 0;

	// How many slides the webview shows, once it has rendered.
	public slideCount: number | null = null;

	public constructor(
		extensionUri: vscode.Uri,
		// Replaced when the document is opened again after it was closed.
		private document: vscode.TextDocument,
		private readonly panel: vscode.WebviewPanel,
		private readonly onDispose: () => void
	) {
		const previewRoot = vscode.Uri.joinPath(
			extensionUri,
			'dist',
			'preview'
		);
		panel.title = vscode.l10n.t(
			'Slide Preview: {0}',
			path.posix.basename( document.uri.path )
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
			vscode.workspace.onDidChangeTextDocument( ( event ) => {
				if ( this.isOwnDocument( event.document ) ) {
					this.document = event.document;
					this.scheduleRender();
				}
			} ),
			vscode.workspace.onDidOpenTextDocument( ( opened ) => {
				if ( this.isOwnDocument( opened ) ) {
					this.document = opened;
					this.scheduleRender();
				}
			} )
		);

		panel.onDidDispose( () => this.dispose() );
	}

	// Shows the panel where it is, without taking the focus.
	public reveal(): void {
		this.panel.reveal( undefined, true );
	}

	// Handles a message from the webview.
	private onWebviewMessage( message: PreviewWebviewMessage ): void {
		switch ( message.type ) {
			case 'ready':
				this.isReady = true;
				this.post( {
					type: 'document',
					uri: this.document.uri.toString(),
					labels: getLabels(),
				} );
				void this.render();
				break;

			case 'rendered':
				this.slideCount = message.slideCount;
				break;
		}
	}

	// Renders the slides again once the edits in progress settle.
	private scheduleRender(): void {
		if ( ! this.isReady || this.renderTimer !== undefined ) {
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
		const renderId = ++this.renderCount;
		const markdown = this.document.getText();
		if ( ! isMarpDocument( markdown ) ) {
			this.post( {
				type: 'notice',
				text: vscode.l10n.t( 'Not a Marp document' ),
			} );
			return;
		}
		const { renderSlides } = await loadMarpPreview();
		if ( this.isDisposed || renderId !== this.renderCount ) {
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

	// Whether the document is the one this session previews.
	private isOwnDocument( document: vscode.TextDocument ): boolean {
		return document.uri.toString() === this.document.uri.toString();
	}

	// Releases the session's resources.
	private dispose(): void {
		this.isDisposed = true;
		this.onDispose();
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
