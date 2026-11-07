/**
 * External dependencies
 */
import * as crypto from 'node:crypto';
import * as vscode from 'vscode';

// The page of the slide preview, built by `vite.preview.config.ts` under
// fixed names for this template to reference.
export function getHtmlForPreview(
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

	// `style-src` needs `unsafe-inline` for the deck's stylesheet, which the
	// page sets as a `<style>`, and the inline styles Marp puts on slides.
	// `img-src` allows `https:` and `data:` for images the deck links to.
	const csp = [
		`default-src 'none'`,
		`script-src 'nonce-${ nonce }' ${ webview.cspSource }`,
		`style-src ${ webview.cspSource } 'unsafe-inline'`,
		`img-src ${ webview.cspSource } https: data:`,
		`font-src ${ webview.cspSource }`,
	].join( '; ' );

	return `<!DOCTYPE html>
<html lang="${ vscode.env.language }">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<meta http-equiv="Content-Security-Policy" content="${ csp }" />
		<link href="${ styleUri }" rel="stylesheet" />
		<title>MarkBricks</title>
	</head>
	<body>
		<script type="module" nonce="${ nonce }" src="${ scriptUri }"></script>
	</body>
</html>`;
}
