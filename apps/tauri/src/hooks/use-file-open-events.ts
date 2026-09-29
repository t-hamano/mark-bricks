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
import { openDocument, type OpenedDocument } from '../actions';

type OpenRequestResult = { path: string; document: OpenedDocument | null };

async function openPendingDocuments() {
	const requests = await invoke< OpenRequestResult[] >(
		'take_pending_documents'
	);
	const failed: string[] = [];

	for ( const { path, document } of requests ) {
		if ( ! document ) {
			failed.push( path );
			continue;
		}
		try {
			await openDocument( document );
		} catch {
			failed.push( path );
		}
	}
	// A path can be requested twice, e.g. the active document is reopened
	// last after an update, so each failure is listed once.
	const failedPaths = [ ...new Set( failed ) ];

	if ( failedPaths.length > 0 ) {
		const intro = _n(
			'Could not open the following file:',
			'Could not open the following files:',
			failedPaths.length,
			'mark-bricks'
		);
		await message( `${ intro }\n${ failedPaths.join( '\n' ) }`, {
			title: __( 'Open file', 'mark-bricks' ),
			kind: 'error',
		} );
	}
}

/**
 * Opens Markdown files the OS hands to the app. It listens for the `open-files`
 * event the Rust backend emits while the app is running, then drains
 * `take_pending_documents` for requests delivered before the listener existed.
 * Event payloads never supply file paths; only the native queue can grant access.
 */
export default function useFileOpenEvents() {
	useEffect( () => {
		let unlisten: UnlistenFn | undefined;
		let cancelled = false;

		( async () => {
			unlisten = await listen( 'open-files', () => {
				void openPendingDocuments();
			} );

			if ( cancelled ) {
				unlisten();
				return;
			}

			// Drain any file paths the OS handed us before the listener
			// was attached.
			await openPendingDocuments();
		} )();

		return () => {
			cancelled = true;
			unlisten?.();
		};
	}, [] );
}
