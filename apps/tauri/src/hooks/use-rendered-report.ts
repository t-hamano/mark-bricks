/**
 * External dependencies
 */
import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

/**
 * Reports to the backend once the canvas shows the blocks, for the smoke test.
 *
 * @param filePath Path of the active tab's file.
 */
export default function useRenderedReport( filePath: string | undefined ) {
	useEffect( () => {
		if ( ! filePath ) {
			return;
		}
		const timer = setInterval( () => {
			const canvas = document.querySelector< HTMLIFrameElement >(
				'iframe[name="editor-canvas"]'
			);
			if (
				canvas?.contentDocument?.querySelector(
					'.block-editor-block-list__block'
				)
			) {
				clearInterval( timer );
				void invoke( 'report_rendered', { path: filePath } );
			}
		}, 100 );
		return () => clearInterval( timer );
	}, [ filePath ] );
}
