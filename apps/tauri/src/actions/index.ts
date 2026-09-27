/**
 * External dependencies
 */
import { invoke } from '@tauri-apps/api/core';

/**
 * WordPress dependencies
 */
import { dispatch, select } from '@wordpress/data';

/**
 * Internal dependencies
 */
import tabsStore from '../store';

export type DocumentInfo = { documentId: string; path: string };
export type OpenedDocument = DocumentInfo & { contents: string };

let flushEditor: ( () => void ) | null = null;

/**
 * Registers the mounted editor's flush callback.
 *
 * @param fn Flush callback, or `null` when the editor unmounts.
 */
export function setEditorFlush( fn: ( () => void ) | null ) {
	flushEditor = fn;
}

/**
 * Pushes the editor's debounced change into the store.
 */
export function flushPendingEdits() {
	flushEditor?.();
}

export function newFile() {
	dispatch( tabsStore ).openTab();
}

export async function openFile() {
	const document = await invoke< OpenedDocument | null >( 'open_document' );
	if ( document ) {
		await openDocument( document );
	}
}

export async function openDocument( {
	documentId,
	path,
	contents,
}: OpenedDocument ) {
	const existing = select( tabsStore )
		.getTabs()
		.find( ( t ) => t.filePath === path );

	if ( existing ) {
		if ( existing.documentId !== documentId ) {
			await invoke( 'close_document', { documentId } );
		}
		dispatch( tabsStore ).setActiveTab( existing.id );
		return;
	}

	// When the only open tab is an untouched Untitled tab, replace it with the
	// opened file rather than leaving an empty tab behind.
	const tabs = select( tabsStore ).getTabs();
	const blankTab =
		tabs.length === 1 && ! tabs[ 0 ].filePath && ! tabs[ 0 ].isDirty
			? tabs[ 0 ]
			: null;

	dispatch( tabsStore ).openFileTab( path, contents, documentId );

	if ( blankTab ) {
		dispatch( tabsStore ).closeTab( blankTab.id );
	}
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
	flushPendingEdits();

	const tab = select( tabsStore )
		.getTabs()
		.find( ( t ) => t.id === id );

	if ( ! tab ) {
		return false;
	}

	if ( tab.documentId ) {
		await invoke( 'write_document', {
			documentId: tab.documentId,
			contents: tab.content,
		} );
		if (
			select( tabsStore )
				.getTabs()
				.find( ( t ) => t.id === id )?.content === tab.content
		) {
			dispatch( tabsStore ).setTabDirty( id, false );
		}
		return true;
	}

	return saveTabAs( id );
}

export async function saveTabAs( id: string ) {
	flushPendingEdits();

	const tab = select( tabsStore )
		.getTabs()
		.find( ( t ) => t.id === id );

	if ( ! tab ) {
		return false;
	}

	const document = await invoke< DocumentInfo | null >( 'save_document_as', {
		contents: tab.content,
	} );

	if ( ! document ) {
		return false;
	}

	const current = select( tabsStore )
		.getTabs()
		.find( ( t ) => t.id === id );
	if ( ! current || current.documentId !== tab.documentId ) {
		await invoke( 'close_document', { documentId: document.documentId } );
		return false;
	}
	dispatch( tabsStore ).setTabFile( id, document.path, document.documentId );
	if ( current.content === tab.content ) {
		dispatch( tabsStore ).setTabDirty( id, false );
	}
	if ( tab.documentId ) {
		await invoke( 'close_document', { documentId: tab.documentId } );
	}

	return true;
}

export function requestCloseActiveTab() {
	const id = select( tabsStore ).getActiveTabId();

	if ( ! id ) {
		return;
	}

	requestCloseTab( id );
}

export async function closeTab( id: string ) {
	const tab = select( tabsStore )
		.getTabs()
		.find( ( t ) => t.id === id );
	// Remove the tab before awaiting IPC so a pending Save As cannot attach
	// a new document grant to a tab that is already closing.
	dispatch( tabsStore ).closeTab( id );
	if ( tab?.documentId ) {
		await invoke( 'close_document', { documentId: tab.documentId } );
	}
}

export function requestCloseTab( id: string ) {
	flushPendingEdits();

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

	void closeTab( id );
}

export async function closeOtherTabs( keepId: string ) {
	const others = select( tabsStore )
		.getTabs()
		.filter( ( t ) => t.id !== keepId );

	dispatch( tabsStore ).setActiveTab( keepId );

	for ( const tab of others ) {
		if ( ! tab.isDirty ) {
			await closeTab( tab.id );
		}
	}

	const firstDirty = others.find( ( t ) => t.isDirty );

	if ( firstDirty ) {
		dispatch( tabsStore ).setPendingCloseId( firstDirty.id );
	}
}
