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
			return;
		}
		// Reopen the current files after the relaunch. Launch arguments cannot
		// carry them: the Windows installer mangles paths, and files opened
		// from the macOS Finder are not arguments at all.
		const documentIds = select( tabsStore )
			.getTabs()
			.flatMap( ( tab ) => ( tab.documentId ? [ tab.documentId ] : [] ) );
		await invoke( 'remember_documents_for_relaunch', { documentIds } );
		try {
			await update.downloadAndInstall();
		} catch ( error ) {
			await invoke( 'remember_documents_for_relaunch', {
				documentIds: [],
			} );
			throw error;
		}
		await relaunch();
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
