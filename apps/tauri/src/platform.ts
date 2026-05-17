/**
 * External dependencies
 */
import { convertFileSrc } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import type { Platform } from '@mark-bricks/editor';

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
 * Tauri implementation of the editor platform integration points.
 */
const platform: Platform = {
	async pickImageFile() {
		const path = await openDialog( {
			multiple: false,
			filters: [ { name: 'Image', extensions: IMAGE_EXTENSIONS } ],
		} );
		return typeof path === 'string' ? path : null;
	},
	async resolveImageSrc( path ) {
		// URLs the webview can load directly, without the asset protocol.
		if ( /^(https?:|data:|blob:)/i.test( path ) ) {
			return path;
		}
		return convertFileSrc( path );
	},
};

export default platform;
