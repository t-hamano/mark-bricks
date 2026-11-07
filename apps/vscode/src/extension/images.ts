/**
 * External dependencies
 */
import * as vscode from 'vscode';
import { parseImageSrc } from '@mark-bricks/image-path';

// Folders a webview may load a document's local images from: the document's
// folder and the workspace folders, which `resolveImageUri` resolves paths
// against.
export function getImageRoots( documentUri: vscode.Uri ): vscode.Uri[] {
	return [
		vscode.Uri.joinPath( documentUri, '..' ),
		...( vscode.workspace.workspaceFolders ?? [] ).map(
			( folder ) => folder.uri
		),
	];
}

// Resolves an image path from the markdown to the file it points to:
// relative paths against the document, `/`-rooted ones against its
// workspace folder (as the built-in markdown preview does), and absolute
// file system paths and `file:` URLs as is. Returns `null` for URLs the
// webview loads directly.
export function resolveImageUri(
	src: string,
	documentUri: vscode.Uri
): vscode.Uri | null {
	const parsedImage = parseImageSrc( src );
	switch ( parsedImage.type ) {
		case 'url':
			return null;
		case 'absolute':
			return vscode.Uri.file( parsedImage.path );
		case 'rooted': {
			const folder = vscode.workspace.getWorkspaceFolder( documentUri );
			return folder
				? vscode.Uri.joinPath( folder.uri, parsedImage.path )
				: vscode.Uri.file( parsedImage.path );
		}
		case 'relative':
			return vscode.Uri.joinPath( documentUri, '..', parsedImage.path );
	}
}
