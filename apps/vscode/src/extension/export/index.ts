/**
 * External dependencies
 */
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';

/**
 * Internal dependencies
 */
import { getActiveDocument } from '../marp-context';
import { getMarpCliPath, loadMarpCli } from './load-marp-cli';

export const EXPORT_COMMAND = 'markBricks.exportSlideDeck';

const BROWSER_LINKS = [
	'[Google Chrome](https://www.google.com/chrome/)',
	'[Microsoft Edge](https://www.microsoft.com/edge)',
	'[Mozilla Firefox](https://www.mozilla.org/firefox/)',
];

let extensionPath = '';

// An error whose message is ready to show as it is.
class ExportError extends Error {}

type WorkFile = {
	path: string;
	cleanup: () => Promise< void >;
};

const workFileName = ( extension: string ) =>
	`.mark-bricks-export-${ randomUUID() }${ extension }`;

async function writeWorkFile(
	filePath: string,
	text: string
): Promise< WorkFile > {
	await writeFile( filePath, text );
	return { path: filePath, cleanup: () => rm( filePath, { force: true } ) };
}

// The Markdown file Marp CLI reads: the document's own file when it is saved
// as UTF-8, or else a hidden copy of its text next to it, so that relative
// image paths resolve, or in the OS temporary directory.
async function createWorkFile(
	document: vscode.TextDocument
): Promise< WorkFile > {
	const isLocal = document.uri.scheme === 'file';
	if (
		isLocal &&
		! document.isDirty &&
		[ 'utf8', 'utf8bom' ].includes( document.encoding )
	) {
		return { path: document.uri.fsPath, cleanup: async () => {} };
	}

	const text = document.getText();
	if ( isLocal ) {
		try {
			return await writeWorkFile(
				path.join(
					path.dirname( document.uri.fsPath ),
					workFileName( '.md' )
				),
				text
			);
		} catch {
			// The folder is read-only.
		}
	}
	return writeWorkFile( path.join( tmpdir(), workFileName( '.md' ) ), text );
}

async function exportHtml(
	document: vscode.TextDocument,
	uri: vscode.Uri
): Promise< void > {
	const { renderHtmlDocument } =
		await import( '@mark-bricks/marp-preview/export' );
	await vscode.workspace.fs.writeFile(
		uri,
		new TextEncoder().encode( renderHtmlDocument( document.getText() ) )
	);
}

async function exportPdf(
	document: vscode.TextDocument,
	uri: vscode.Uri
): Promise< void > {
	const { marpCli, CLIError, CLIErrorCode } = loadMarpCli( extensionPath );
	const input = await createWorkFile( document );
	// Marp CLI writes only to the local file system, so a remote or virtual
	// output goes through a temporary file.
	const output =
		uri.scheme === 'file'
			? uri.fsPath
			: path.join( tmpdir(), workFileName( '.pdf' ) );

	try {
		const exitCode = await marpCli( [
			input.path,
			'--pdf',
			'--output',
			output,
			'--allow-local-files',
			'--no-config-file',
			'--engine',
			getMarpCliPath( extensionPath ),
		] ).catch( ( error: unknown ) => {
			if (
				error instanceof CLIError &&
				error.errorCode === CLIErrorCode.NOT_FOUND_BROWSER
			) {
				throw new ExportError(
					vscode.l10n.t(
						'Exporting to PDF requires {0}, {1} or {2}.',
						...BROWSER_LINKS
					)
				);
			}
			throw error;
		} );
		if ( exitCode !== 0 ) {
			throw new Error(
				vscode.l10n.t( 'Marp CLI exited with code {0}.', exitCode )
			);
		}
		if ( output !== uri.fsPath ) {
			await vscode.workspace.fs.copy( vscode.Uri.file( output ), uri, {
				overwrite: true,
			} );
		}
	} finally {
		await input.cleanup();
		if ( uri.scheme !== 'file' ) {
			await rm( output, { force: true } );
		}
	}
}

/**
 * Exports a Marp slide deck to HTML, or to PDF when the file name ends with
 * `.pdf`. Exports the document's current text, including unsaved edits.
 *
 * @param document The deck.
 * @param uri      Where to write the exported file.
 */
export async function exportSlideDeck(
	document: vscode.TextDocument,
	uri: vscode.Uri
): Promise< void > {
	if ( path.extname( uri.path ).toLowerCase() === '.pdf' ) {
		await exportPdf( document, uri );
	} else {
		await exportHtml( document, uri );
	}
}

// Where the save dialog starts: the document's own name with the new
// extension, or "untitled" for an unsaved document.
function getDefaultUri( document: vscode.TextDocument ): vscode.Uri {
	if ( document.isUntitled ) {
		const folder =
			vscode.workspace.workspaceFolders?.[ 0 ]?.uri ??
			vscode.Uri.file( homedir() );
		return vscode.Uri.joinPath( folder, 'untitled.html' );
	}
	const { dir, name } = path.posix.parse( document.uri.path );
	return document.uri.with( {
		path: path.posix.join( dir, `${ name }.html` ),
	} );
}

// Opens an exported file in its default app. On Windows, `openExternal`
// fails for paths with non-ASCII characters, so Explorer opens it instead.
function openExportedFile( uri: vscode.Uri ): void {
	if ( process.platform === 'win32' ) {
		execFile( 'explorer.exe', [ uri.fsPath ], () => {} );
	} else {
		void vscode.env.openExternal( uri );
	}
}

async function showResult( uri: vscode.Uri ): Promise< void > {
	const message = vscode.l10n.t(
		'Exported the slide deck to {0}.',
		path.posix.basename( uri.path )
	);
	// Only a file on this machine can open in its default app.
	if ( uri.scheme !== 'file' || vscode.env.remoteName ) {
		void vscode.window.showInformationMessage( message );
		return;
	}
	const open = vscode.l10n.t( 'Open' );
	if (
		( await vscode.window.showInformationMessage( message, open ) ) === open
	) {
		openExportedFile( uri );
	}
}

// Asks where to export the deck in the active tab, and exports it.
async function exportActiveSlideDeck(): Promise< void > {
	const document = getActiveDocument();
	if ( ! document ) {
		return;
	}
	const uri = await vscode.window.showSaveDialog( {
		defaultUri: getDefaultUri( document ),
		filters: {
			[ vscode.l10n.t( 'HTML slide deck' ) ]: [ 'html' ],
			[ vscode.l10n.t( 'PDF slide deck' ) ]: [ 'pdf' ],
		},
		saveLabel: vscode.l10n.t( 'Export' ),
		title: vscode.l10n.t( 'Export Slide Deck' ),
	} );
	if ( ! uri ) {
		return;
	}

	try {
		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: vscode.l10n.t( 'Exporting the slide deck…' ),
			},
			() => exportSlideDeck( document, uri )
		);
	} catch ( error ) {
		void vscode.window.showErrorMessage(
			error instanceof ExportError
				? error.message
				: vscode.l10n.t(
						'Could not export the slide deck: {0}',
						error instanceof Error ? error.message : String( error )
					)
		);
		return;
	}
	await showResult( uri );
}

export function registerExportCommand(
	context: vscode.ExtensionContext
): vscode.Disposable {
	extensionPath = context.extensionPath;
	return vscode.commands.registerCommand(
		EXPORT_COMMAND,
		exportActiveSlideDeck
	);
}
