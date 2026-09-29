/**
 * External dependencies
 */
import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { ask, message } from '@tauri-apps/plugin-dialog';
import { getVersion } from '@tauri-apps/api/app';

/**
 * WordPress dependencies
 */
import { select, useSelect } from '@wordpress/data';
import { store as preferencesStore } from '@wordpress/preferences';
import { __, sprintf } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import tabsStore from '../store';

type CheckOptions = {
	// When true, do nothing if no update is available and swallow errors silently.
	// Used for the automatic check on app start.
	silent?: boolean;
};

/**
 * Tells the user to save first when a tab has unsaved changes, since the
 * installer quits the app.
 *
 * @return Whether the update has to stop for unsaved changes.
 */
async function stopForUnsavedChanges(): Promise< boolean > {
	const hasDirtyTabs = select( tabsStore )
		.getTabs()
		.some( ( tab ) => tab.isDirty );
	if ( hasDirtyTabs ) {
		await message(
			__(
				'You have unsaved changes. Please save them before updating.',
				'mark-bricks'
			),
			{
				title: __( 'Unsaved changes', 'mark-bricks' ),
				kind: 'warning',
			}
		);
	}
	return hasDirtyTabs;
}

/**
 * The IDs of the open documents to reopen after the relaunch, in tab order.
 *
 * Each reopened document becomes the active tab, so the active one is listed
 * once more at the end: opening a document that is already open only switches
 * to its tab, which leaves the user where they were.
 *
 * @return Document IDs to pass to `remember_documents_for_relaunch`.
 */
function documentIdsForRelaunch(): string[] {
	const { getTabs, getActiveTabId } = select( tabsStore );
	const tabs = getTabs();
	const documentIds = tabs.flatMap( ( tab ) =>
		tab.documentId ? [ tab.documentId ] : []
	);
	const activeDocumentId = tabs.find(
		( tab ) => tab.id === getActiveTabId()
	)?.documentId;
	if (
		activeDocumentId &&
		documentIds[ documentIds.length - 1 ] !== activeDocumentId
	) {
		documentIds.push( activeDocumentId );
	}
	return documentIds;
}

export async function checkForUpdates( { silent = false }: CheckOptions = {} ) {
	try {
		const update = await check();
		if ( ! update ) {
			if ( ! silent ) {
				await message(
					sprintf(
						/* translators: %s: current version number */
						__(
							'You are using the latest version (%s).',
							'mark-bricks'
						),
						await getVersion()
					),
					{
						title: __( 'Update', 'mark-bricks' ),
						kind: 'info',
					}
				);
			}
			return;
		}
		const accepted = await ask(
			sprintf(
				/* translators: %s: new version number */
				__( 'MarkBricks %s is available. Install now?', 'mark-bricks' ),
				update.version
			),
			{
				title: __( 'Update available', 'mark-bricks' ),
				kind: 'info',
			}
		);
		if ( ! accepted ) {
			return;
		}
		if ( await stopForUnsavedChanges() ) {
			return;
		}
		await update.download();
		// The app stays usable during the download, so tabs may have been
		// edited, opened, or closed meanwhile.
		if ( await stopForUnsavedChanges() ) {
			return;
		}
		// Reopen the current files after the relaunch. Launch arguments cannot
		// carry them: the Windows installer mangles paths, and files opened
		// from the macOS Finder are not arguments at all.
		await invoke( 'remember_documents_for_relaunch', {
			documentIds: documentIdsForRelaunch(),
		} );
		try {
			await update.install();
			await relaunch();
		} catch ( error ) {
			// The app keeps running, so a later ordinary launch must not
			// reopen these files.
			await invoke( 'remember_documents_for_relaunch', {
				documentIds: [],
			} );
			throw error;
		}
	} catch ( error ) {
		if ( silent ) {
			return;
		}
		await message(
			sprintf(
				/* translators: %s: error message */
				__( 'Update check failed: %s', 'mark-bricks' ),
				String( error )
			),
			{
				title: __( 'Update', 'mark-bricks' ),
				kind: 'error',
			}
		);
	}
}

export default function useAutoUpdater() {
	const checkUpdatesAuto = useSelect( ( selectStore ) => {
		const { get } = selectStore( preferencesStore );
		return !! get( 'mark-bricks', 'checkUpdatesAuto' );
	}, [] );

	useEffect( () => {
		if ( ! checkUpdatesAuto ) {
			return;
		}
		checkForUpdates( { silent: true } );
	}, [ checkUpdatesAuto ] );
}
