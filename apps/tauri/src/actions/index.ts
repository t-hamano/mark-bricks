/**
 * External dependencies
 */
import { invoke } from '@tauri-apps/api/core';
import { getLocale } from '@mark-bricks/editor/i18n';

/**
 * WordPress dependencies
 */
import { dispatch, select } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import tabsStore from '../store';

export type DocumentInfo = { documentId: string; path: string };
export type OpenedDocument = DocumentInfo & { contents: string | null };

let flushEditor: ( () => void ) | null = null;
const saves = new Map< string, Promise< boolean > >();

// A tab's Save and Save As operations must reach native I/O in request order.
function enqueueSave( id: string, operation: () => Promise< boolean > ) {
	flushPendingEdits();
	const previous = saves.get( id );
	const saving = previous
		? previous.then( operation, operation )
		: operation();
	saves.set( id, saving );
	const cleanup = () => {
		if ( saves.get( id ) === saving ) {
			saves.delete( id );
		}
	};
	void saving.then( cleanup, cleanup );
	return saving;
}

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
}: OpenedDocument ): Promise< void > {
	const existing = select( tabsStore )
		.getTabs()
		.find( ( t ) => t.filePath === path );

	if ( existing ) {
		dispatch( tabsStore ).setActiveTab( existing.id );
		// Each native open owns a reference, even when it reuses the same ID.
		await invoke( 'close_document', { documentId } );
		return;
	}
	if ( contents === null ) {
		// The previous tab may have closed while the native result was in flight.
		// Read through its retained grant and recheck for concurrent tab opens.
		let loaded: string;
		try {
			loaded = await invoke< string >( 'read_document', { documentId } );
		} catch ( error ) {
			await invoke( 'close_document', { documentId } );
			throw error;
		}
		return openDocument( { documentId, path, contents: loaded } );
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

export function saveTab( id: string ) {
	return enqueueSave( id, () => saveTabNow( id ) );
}

async function saveTabNow( id: string ) {
	flushPendingEdits();

	const tab = select( tabsStore )
		.getTabs()
		.find( ( t ) => t.id === id );

	if ( ! tab ) {
		return false;
	}

	if ( tab.documentId ) {
		try {
			await invoke( 'write_document', {
				documentId: tab.documentId,
				contents: tab.content,
			} );
		} catch ( error ) {
			if (
				typeof error === 'object' &&
				error !== null &&
				'code' in error &&
				error.code === 'save_as_required'
			) {
				const current = select( tabsStore )
					.getTabs()
					.find( ( t ) => t.id === id );
				if ( current?.documentId !== tab.documentId ) {
					return false;
				}
				// Keep the edits and let the user choose where to save them.
				return saveTabAsNow( id );
			}
			throw error;
		}
		if (
			select( tabsStore )
				.getTabs()
				.find( ( t ) => t.id === id )?.content === tab.content
		) {
			dispatch( tabsStore ).setTabDirty( id, false );
		}
		return true;
	}

	return saveTabAsNow( id );
}

export function saveTabAs( id: string ) {
	return enqueueSave( id, () => saveTabAsNow( id ) );
}

async function saveTabAsNow( id: string ) {
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
		flushPendingEdits();
		const current = select( tabsStore )
			.getTabs()
			.find( ( t ) => t.id === tab.id );
		if ( current && ! current.isDirty ) {
			await closeTab( current.id );
		}
	}

	flushPendingEdits();
	const firstDirty = select( tabsStore )
		.getTabs()
		.find(
			( t ) => t.isDirty && others.some( ( other ) => other.id === t.id )
		);

	if ( firstDirty ) {
		dispatch( tabsStore ).setPendingCloseId( firstDirty.id );
	}
}

/**
 * Opens the slide preview window, or brings it to the front when it is
 * already open.
 */
export async function openPreview() {
	await invoke( 'open_preview', {
		title: __( 'Slide Preview', 'mark-bricks' ),
		locale: getLocale(),
	} );
}
