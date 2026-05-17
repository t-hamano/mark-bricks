/**
 * External dependencies
 */
import { invoke } from '@tauri-apps/api/core';
import {
	open as openDialog,
	save as saveDialog,
} from '@tauri-apps/plugin-dialog';

/**
 * WordPress dependencies
 */
import { dispatch, select } from '@wordpress/data';

/**
 * Internal dependencies
 */
import tabsStore from '../store';

const FILE_FILTERS = [ { name: 'Markdown', extensions: [ 'md' ] } ];

export function newFile() {
	dispatch( tabsStore ).openTab();
}

export async function openFile() {
	const path = await openDialog( {
		filters: FILE_FILTERS,
		multiple: false,
	} );

	if ( typeof path !== 'string' ) {
		return;
	}

	const tabs = select( tabsStore ).getTabs();
	const existing = tabs.find( ( t ) => t.filePath === path );

	if ( existing ) {
		dispatch( tabsStore ).setActiveTab( existing.id );
		return;
	}

	const contents = await invoke< string >( 'read_text_file', { path } );
	dispatch( tabsStore ).openFileTab( path, contents );
}

export async function saveActiveFile() {
	const id = select( tabsStore ).getActiveTabId();

	if ( ! id ) {
		return false;
	}

	return saveTab( id );
}

export async function saveActiveFileAs() {
	const id = select( tabsStore ).getActiveTabId();

	if ( ! id ) {
		return false;
	}

	return saveTabAs( id );
}

export async function saveTab( id: string ) {
	const tab = select( tabsStore )
		.getTabs()
		.find( ( t ) => t.id === id );

	if ( ! tab ) {
		return false;
	}

	if ( tab.filePath ) {
		await invoke( 'write_text_file', {
			path: tab.filePath,
			contents: tab.content,
		} );
		dispatch( tabsStore ).setTabDirty( id, false );
		return true;
	}

	return saveTabAs( id );
}

export async function saveTabAs( id: string ) {
	const tab = select( tabsStore )
		.getTabs()
		.find( ( t ) => t.id === id );

	if ( ! tab ) {
		return false;
	}

	const path = await saveDialog( { filters: FILE_FILTERS } );

	if ( typeof path !== 'string' ) {
		return false;
	}

	await invoke( 'write_text_file', { path, contents: tab.content } );
	dispatch( tabsStore ).setTabFile( id, path );
	dispatch( tabsStore ).setTabDirty( id, false );

	return true;
}

export function requestCloseActiveTab() {
	const id = select( tabsStore ).getActiveTabId();

	if ( ! id ) {
		return;
	}

	requestCloseTab( id );
}

export function requestCloseTab( id: string ) {
	const tab = select( tabsStore )
		.getTabs()
		.find( ( t ) => t.id === id );

	if ( ! tab ) {
		return;
	}

	if ( tab.isDirty ) {
		dispatch( tabsStore ).setPendingCloseId( id );
		return;
	}

	dispatch( tabsStore ).closeTab( id );
}

export function closeOtherTabs( keepId: string ) {
	const others = select( tabsStore )
		.getTabs()
		.filter( ( t ) => t.id !== keepId );

	dispatch( tabsStore ).setActiveTab( keepId );

	for ( const tab of others ) {
		if ( ! tab.isDirty ) {
			dispatch( tabsStore ).closeTab( tab.id );
		}
	}

	const firstDirty = others.find( ( t ) => t.isDirty );

	if ( firstDirty ) {
		dispatch( tabsStore ).setPendingCloseId( firstDirty.id );
	}
}
