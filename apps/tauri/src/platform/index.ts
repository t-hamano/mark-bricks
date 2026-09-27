/**
 * External dependencies
 */
import { convertFileSrc } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import type { Platform } from '@mark-bricks/editor';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

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

// URLs the webview can load directly, without the asset protocol.
const WEB_URL = /^(https?:|data:|blob:)/i;

// POSIX (`/foo`), Windows drive (`C:\foo`, `C:/foo`) and UNC (`\\host`).
const ABSOLUTE_PATH = /^([/\\]|[a-z]:[/\\])/i;

/**
 * Whether an image path from the markdown is relative to the document.
 *
 * @param src Image path or URL as written in the markdown.
 */
export function isRelativeImagePath( src: string ) {
	return (
		! WEB_URL.test( src ) &&
		! /^file:/i.test( src ) &&
		! ABSOLUTE_PATH.test( src )
	);
}

/**
 * Resolves an image path from the markdown to an absolute file system path:
 * relative paths against the folder of the document, and absolute paths and
 * `file:` URLs as is. Relative paths stay unresolved when the document has
 * not been saved yet.
 *
 * @param src          Image path as written in the markdown.
 * @param documentPath Path of the markdown file, if it has one.
 */
export function resolveImagePath( src: string, documentPath?: string ) {
	// Only `file:` URLs have a query or hash to drop; in plain paths, `?` and
	// `#` are part of the file name (e.g. `chart#final.png` from the picker).
	// `file:///C:/foo` -> `/C:/foo` -> `C:/foo`, `file:///foo` -> `/foo`.
	let target = /^file:/i.test( src )
		? new URL( src ).pathname.replace( /^\/(?=[a-z]:)/i, '' )
		: src;
	try {
		// Unlike `decodeURI`, this also decodes `%23` (`#`) and `%3F` (`?`).
		target = decodeURIComponent( target );
	} catch {
		// Not percent-encoded; use it verbatim.
	}
	if ( ABSOLUTE_PATH.test( target ) || ! documentPath ) {
		return target;
	}

	const separator = documentPath.includes( '\\' ) ? '\\' : '/';
	const segments = documentPath.split( /[/\\]/ ).slice( 0, -1 );
	// Never climb above the root: `''` for `/`, the drive for `C:\`, or
	// `'', '', host, share` for a UNC path (`\\host\share`).
	const rootLength = /^[/\\]{2}/.test( documentPath ) ? 4 : 1;
	for ( const segment of target.split( /[/\\]/ ) ) {
		if ( segment === '..' ) {
			if ( segments.length > rootLength ) {
				segments.pop();
			}
		} else if ( segment !== '.' && segment !== '' ) {
			segments.push( segment );
		}
	}
	return segments.join( separator );
}

/**
 * Creates the Tauri implementation of the editor platform integration points.
 *
 * @param documentPath Path of the markdown file being edited, if it has one.
 */
export function createPlatform( documentPath?: string ): Platform {
	return {
		async pickImageFile() {
			const path = await openDialog( {
				multiple: false,
				filters: [ { name: 'Image', extensions: IMAGE_EXTENSIONS } ],
			} );
			return typeof path === 'string' ? path : null;
		},
		async resolveImageSrc( path ) {
			if ( WEB_URL.test( path ) ) {
				return path;
			}
			return convertFileSrc( resolveImagePath( path, documentPath ) );
		},
		async getImageNotice( path ) {
			// The CSP (`img-src` in `tauri.conf.json`) blocks `http:` URLs.
			if ( /^http:/i.test( path ) ) {
				return __(
					'Images from HTTP URLs cannot be displayed. Use an HTTPS URL instead.',
					'mark-bricks'
				);
			}
			// An unsaved document has no folder to resolve relative paths
			// against.
			if ( ! documentPath && isRelativeImagePath( path ) ) {
				return __(
					'Images with relative paths are displayed once the document is saved.',
					'mark-bricks'
				);
			}
			return null;
		},
	};
}
