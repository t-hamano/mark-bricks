/**
 * External dependencies
 */
import * as crypto from 'node:crypto';
import * as vscode from 'vscode';

/**
 * SHA-256 of the one inline script the block canvas document carries:
 *
 *     document.currentScript.parentElement.remove()
 *
 * `@wordpress/block-editor`'s Iframe component seeds the canvas with a
 * throwaway `<body>` holding this script, which deletes that body so React 18
 * can mount its own (`components/iframe/index.mjs`, guarded on the React major
 * version). A blob-URL document inherits the embedder's CSP, so without this
 * hash the script is blocked, the placeholder survives, and the canvas ends up
 * with two `<body>` elements — the blocks render inside the second one while
 * `document.body` still points at the empty first.
 *
 * A nonce cannot cover it: the markup comes from inside the library. If a
 * Gutenberg upgrade rewrites that line, the symptom is the duplicate body, and
 * this constant is what needs updating.
 */
const CANVAS_BOOTSTRAP_HASH =
	'sha256-ehBD9wGNfnN0flaZIjbVClW1//FJFsATigcdVB4VdMQ=';

/**
 * Builds the webview document.
 *
 * The bundle is not entered through Vite's own `index.html`: asset URIs are
 * only knowable here (`asWebviewUri`), and the CSP nonce changes per panel.
 * `vite.config.ts` therefore emits the entry and the stylesheet under fixed
 * names, which is what lets this stay a template.
 *
 * @param webview The panel's webview.
 * @param root    The `dist/webview` directory.
 * @return The HTML to assign to `webview.html`.
 */
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

	// `script-src` has to list the webview origin as well as the nonce: a
	// nonce does not carry over to `import()`, and the entry pulls in its
	// lazily loaded chunks that way.
	//
	// `style-src` needs `unsafe-inline` because `@wordpress/components`
	// injects inline styles by the hundred.
	//
	// `frame-src` has to allow `blob:` for the block canvas, whose document is
	// a Blob URL built by `@wordpress/block-editor`'s Iframe component.
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
