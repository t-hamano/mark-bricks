/**
 * External dependencies
 */
import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { message } from '@tauri-apps/plugin-dialog';

/**
 * WordPress dependencies
 */
import { __, _n } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { openFilePath } from '../actions';

async function openPaths( paths: string[] ) {
	const failed: string[] = [];

	for ( const path of paths ) {
		try {
			await openFilePath( path );
		} catch {
			failed.push( path );
		}
	}

	if ( failed.length > 0 ) {
		const intro = _n(
			'Could not open the following file:',
			'Could not open the following files:',
			failed.length,
			'mark-bricks'
		);
		await message( `${ intro }\n${ failed.join( '\n' ) }`, {
			title: __( 'Open file', 'mark-bricks' ),
			kind: 'error',
		} );
	}
}

/**
 * Opens Markdown files the OS hands to the app. It listens for the `open-files`
 * event the Rust backend emits while the app is running, then drains
 * `take_pending_open_files` for paths delivered before the listener existed.
 */
export default function useFileOpenEvents() {
	useEffect( () => {
		let unlisten: UnlistenFn | undefined;
		let cancelled = false;

		( async () => {
			unlisten = await listen< string[] >( 'open-files', ( event ) => {
				void openPaths( event.payload );
			} );

			if ( cancelled ) {
				unlisten();
				return;
			}

			// Drain any file paths the OS handed us before the listener
			// was attached.
			const pending = await invoke< string[] >(
				'take_pending_open_files'
			);
			if ( pending.length > 0 ) {
				void openPaths( pending );
			}
		} )();

		return () => {
			cancelled = true;
			unlisten?.();
		};
	}, [] );
}
