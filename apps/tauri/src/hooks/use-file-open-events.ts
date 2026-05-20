/**
 * External dependencies
 */
import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

/**
 * Internal dependencies
 */
import { openFilePath } from '../actions';

async function openPaths( paths: string[] ) {
	for ( const path of paths ) {
		try {
			await openFilePath( path );
		} catch {
			// Ignore individual failures (e.g. file moved/deleted between
			// the OS handing us the path and us reading it). The remaining
			// paths in the batch should still be honored.
		}
	}
}

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
			// was attached (e.g. cold-start "Open with" on macOS, or .md
			// path passed on argv on Windows/Linux).
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
