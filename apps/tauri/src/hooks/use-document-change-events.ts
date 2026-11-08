/**
 * External dependencies
 */
import { useEffect } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

/**
 * Internal dependencies
 */
import { handleDocumentChange, type DocumentChange } from '../actions';

/**
 * Reloads open documents when the Rust backend reports, through the
 * `document-changed` event, that their files changed on disk.
 */
export default function useDocumentChangeEvents() {
	useEffect( () => {
		let unlisten: UnlistenFn | undefined;
		let cancelled = false;

		( async () => {
			unlisten = await listen< DocumentChange >(
				'document-changed',
				( { payload } ) => {
					void handleDocumentChange( payload );
				}
			);

			if ( cancelled ) {
				unlisten();
			}
		} )();

		return () => {
			cancelled = true;
			unlisten?.();
		};
	}, [] );
}
