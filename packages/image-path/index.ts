/**
 * An image source from the markdown, classified by what it is relative to:
 * - `url`: a URL the webview loads directly (`https:`, `data:`, …).
 * - `absolute`: a file system path, e.g. `C:\foo.png` or a `file:` URL.
 * - `rooted`: a path starting with a single `/`. Hosts decide whether it is
 *   absolute or relative to a root such as the workspace folder.
 * - `relative`: a path relative to the folder of the document.
 *
 * Paths are percent-decoded.
 */
export type ImageSrc =
	| { type: 'url' }
	| { type: 'absolute' | 'rooted' | 'relative'; path: string };

// URLs the webview loads directly. A `file:` URL that cannot be parsed is
// also left to the webview.
const WEB_URL = /^(https?:|data:|blob:)/i;

// Windows drive (`C:\foo`, `C:/foo`), UNC (`\\host`, `//host`) and a path
// rooted on the current drive (`\foo`).
const ABSOLUTE_PATH = /^([a-z]:[/\\]|[/\\]{2}|\\)/i;

/**
 * Converts a `file:` URL to a still percent-encoded file system path:
 * - `file:///C:/foo` -> `C:/foo`
 * - `file:///foo` -> `/foo`
 * - `file://server/share/foo` -> `\\server\share\foo` (UNC)
 *
 * @param url `file:` URL.
 */
function fileUrlToPath( url: string ) {
	const { hostname, pathname } = new URL( url );
	if ( hostname && hostname !== 'localhost' ) {
		return `\\\\${ hostname }${ pathname.replace( /\//g, '\\' ) }`;
	}
	return pathname.replace( /^\/(?=[a-z]:)/i, '' );
}

function decode( path: string ) {
	try {
		// Unlike `decodeURI`, this also decodes `%23` (`#`) and `%3F` (`?`).
		return decodeURIComponent( path );
	} catch {
		// Not percent-encoded, e.g. `100%.png`; use it verbatim.
		return path;
	}
}

/**
 * Classifies an image source from the markdown and decodes its path. Only
 * `file:` URLs have a query or hash to drop; in plain paths, `?` and `#` are
 * part of the file name (e.g. `chart#final.png` from a file picker).
 *
 * @param src Image path or URL as written in the markdown.
 */
export function parseImageSrc( src: string ): ImageSrc {
	if ( WEB_URL.test( src ) ) {
		return { type: 'url' };
	}
	if ( /^file:/i.test( src ) ) {
		try {
			return { type: 'absolute', path: decode( fileUrlToPath( src ) ) };
		} catch {
			return { type: 'url' };
		}
	}
	const path = decode( src );
	if ( ABSOLUTE_PATH.test( path ) ) {
		return { type: 'absolute', path };
	}
	if ( path.startsWith( '/' ) ) {
		return { type: 'rooted', path };
	}
	return { type: 'relative', path };
}
