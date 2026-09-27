/**
 * External dependencies
 */
import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

/**
 * Tells the Rust backend once the block canvas shows the blocks of the file
 * at `filePath`, so the smoke test in `scripts/smoke-launch.mjs` knows the
 * editor rendered. The canvas is an iframe that loads on its own, so poll for
 * it.
 *
 * @param filePath Path of the active tab's file, if it has one.
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
