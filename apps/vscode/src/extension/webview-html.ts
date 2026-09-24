/**
 * External dependencies
 */
import * as crypto from 'node:crypto';
import * as vscode from 'vscode';

// SHA-256 of the inline `document.currentScript.parentElement.remove()`
// script that `@wordpress/block-editor`'s Iframe component seeds the canvas
// with. A blob-URL document inherits our CSP, so without this hash the script
// is blocked and the canvas ends up with two `<body>` elements. If a
// Gutenberg upgrade changes that script, this is what needs updating.
const CANVAS_BOOTSTRAP_HASH =
	'sha256-ehBD9wGNfnN0flaZIjbVClW1//FJFsATigcdVB4VdMQ=';

// Not entered through Vite's own index.html: asset URIs need `asWebviewUri`
// and the CSP nonce changes per panel, so `vite.config.ts` emits the entry
// and stylesheet under fixed names for this template to reference.
export function getHtmlForWebview(
	webview: vscode.Webview,
	root: vscode.Uri
): string {
	const scriptUri = webview.asWebviewUri(
		vscode.Uri.joinPath( root, 'main.js' )
	);
	const styleUri = webview.asWebviewUri(
		vscode.Uri.joinPath( root, 'assets', 'style.css' )
	);
	const nonce = crypto.randomBytes( 16 ).toString( 'base64' );

	// `script-src` lists the webview origin too, since a nonce doesn't carry
	// over to the entry's lazily imported chunks. `style-src` needs
	// `unsafe-inline` for `@wordpress/components`'s inline styles. `frame-src`
	// allows `blob:` for the block canvas, which is a Blob URL document.
	const csp = [
		`default-src 'none'`,
		`script-src 'nonce-${ nonce }' '${ CANVAS_BOOTSTRAP_HASH }' ${ webview.cspSource }`,
		`style-src ${ webview.cspSource } 'unsafe-inline'`,
		`img-src ${ webview.cspSource } https: data: blob:`,
		`font-src ${ webview.cspSource } data:`,
		`frame-src 'self' data: blob:`,
		`connect-src ${ webview.cspSource }`,
	].join( '; ' );

	return `<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<meta http-equiv="Content-Security-Policy" content="${ csp }" />
		<link href="${ styleUri }" rel="stylesheet" />
		<title>MarkBricks</title>
	</head>
	<body>
		<div id="root"></div>
		<script type="module" nonce="${ nonce }" src="${ scriptUri }"></script>
	</body>
</html>`;
}
