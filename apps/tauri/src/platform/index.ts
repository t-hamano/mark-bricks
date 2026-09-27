/**
 * External dependencies
 */
import { convertFileSrc } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import type { Platform } from '@mark-bricks/editor';
import { parseImageSrc } from '@mark-bricks/image-path';

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

/**
 * Resolves an image path from the markdown to an absolute file system path:
 * relative paths against the folder of the document, and absolute paths,
 * `/`-rooted paths and `file:` URLs as is. Relative paths stay unresolved
 * when the document has not been saved yet. Returns `null` for URLs the
 * webview loads directly, without the asset protocol.
 *
 * @param src          Image path or URL as written in the markdown.
 * @param documentPath Path of the markdown file, if it has one.
 */
export function resolveImagePath( src: string, documentPath?: string ) {
	const parsedImage = parseImageSrc( src );
	if ( parsedImage.type === 'url' ) {
		return null;
	}
	if ( parsedImage.type !== 'relative' || ! documentPath ) {
		return parsedImage.path;
	}

	const separator = documentPath.includes( '\\' ) ? '\\' : '/';
	const segments = documentPath.split( /[/\\]/ ).slice( 0, -1 );
	// Never climb above the root: `''` for `/`, the drive for `C:\`, or
	// `'', '', host, share` for a UNC path (`\\host\share`).
	const rootLength = /^[/\\]{2}/.test( documentPath ) ? 4 : 1;
	for ( const segment of parsedImage.path.split( /[/\\]/ ) ) {
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
			const resolved = resolveImagePath( path, documentPath );
			return resolved === null ? path : convertFileSrc( resolved );
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
			if ( ! documentPath && parseImageSrc( path ).type === 'relative' ) {
				return __(
					'Images with relative paths are displayed once the document is saved.',
					'mark-bricks'
				);
			}
			return null;
		},
	};
}
