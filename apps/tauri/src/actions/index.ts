/**
 * External dependencies
 */
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { ask, message } from '@tauri-apps/plugin-dialog';
import { getLocale } from '@mark-bricks/editor/locale';
import { isMarpDocument } from '@mark-bricks/editor/marp';

/**
 * WordPress dependencies
 */
import { dispatch, select } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';

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
			const code =
				typeof error === 'object' && error !== null && 'code' in error
					? error.code
					: null;
			// The file changed on disk after this save was requested. The
			// change's prompt follows; keep the edits until it is answered.
			if ( code === 'changed_on_disk' ) {
				return false;
			}
			if ( code === 'save_as_required' ) {
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

export type DocumentChange = {
	documentId: string;
	// Saves fail until this change is acknowledged.
	revision: number;
	// `null` when the file was deleted or moved away.
	contents: string | null;
};

// The latest change to each document whose reload prompt is open.
const reloadPrompts = new Map< string, DocumentChange >();

function findDocumentTab( documentId: string ) {
	return select( tabsStore )
		.getTabs()
		.find( ( t ) => t.documentId === documentId );
}

// Updates the document's tab for `change`, replacing unsaved changes only
// when `reload` is set.
function applyDocumentChange(
	{ documentId, contents }: DocumentChange,
	reload: boolean
) {
	const tab = findDocumentTab( documentId );

	if ( ! tab ) {
		return;
	}
	if ( contents === null ) {
		// Keep the contents; the next save falls through to Save As.
		dispatch( tabsStore ).setTabDirty( tab.id, true );
	} else if ( tab.content === contents ) {
		dispatch( tabsStore ).setTabDirty( tab.id, false );
	} else if ( reload ) {
		dispatch( tabsStore ).setTabContent( tab.id, contents );
		dispatch( tabsStore ).setTabDirty( tab.id, false );
	}
}

// Lets saves reach the file again. Queued with the tab's saves, so a save
// requested after the change was handled waits for it.
function acknowledgeDocumentChange( { documentId, revision }: DocumentChange ) {
	const acknowledge = () =>
		invoke( 'acknowledge_document_change', { documentId, revision } ).then(
			() => true
		);
	const tab = findDocumentTab( documentId );
	return tab ? enqueueSave( tab.id, acknowledge ) : acknowledge();
}

/**
 * Applies a change made to an open document's file outside the app. A tab
 * without unsaved changes reloads; a tab with them asks the user first.
 * Keeping their version leaves the tab dirty, so the next save writes it over
 * the outside change.
 *
 * @param change The change the native watcher reported.
 */
export async function handleDocumentChange( change: DocumentChange ) {
	const { documentId, contents } = change;

	if ( reloadPrompts.has( documentId ) ) {
		// The open prompt applies the latest change once answered.
		reloadPrompts.set( documentId, change );
		return;
	}

	flushPendingEdits();
	const tab = findDocumentTab( documentId );
	let latest = change;

	if ( tab?.isDirty && contents !== null && contents !== tab.content ) {
		reloadPrompts.set( documentId, change );
		try {
			const reload = await ask(
				sprintf(
					/* translators: %s: tab title. */
					__(
						'"%s" changed on disk. Reload it and discard your changes, or keep your version?',
						'mark-bricks'
					),
					tab.title
				),
				{
					title: __( 'File changed', 'mark-bricks' ),
					kind: 'warning',
					okLabel: __( 'Reload', 'mark-bricks' ),
					cancelLabel: __( 'Keep my version', 'mark-bricks' ),
				}
			);
			latest = reloadPrompts.get( documentId ) ?? change;
			applyDocumentChange( latest, reload );
		} finally {
			reloadPrompts.delete( documentId );
		}
	} else {
		applyDocumentChange( change, true );
	}

	await acknowledgeDocumentChange( latest );
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

export type ExportFormat = 'html' | 'pdf';

// `busy` from the start of an export to its end, and `printing` while a PDF
// prints, after the dialog. Kept here rather than in a component, since the
// header remounts with each tab.
export type ExportStatus = 'idle' | 'busy' | 'printing';

let exportStatus: ExportStatus = 'idle';
const exportStatusListeners = new Set< () => void >();

function setExportStatus( status: ExportStatus ) {
	exportStatus = status;
	for ( const listener of exportStatusListeners ) {
		listener();
	}
}

export function getExportStatus(): ExportStatus {
	return exportStatus;
}

/**
 * Calls `listener` each time the export status changes.
 *
 * @param listener Called with no arguments.
 * @return A function that stops calling it.
 */
export function subscribeExportStatus( listener: () => void ) {
	exportStatusListeners.add( listener );
	return () => {
		exportStatusListeners.delete( listener );
	};
}

/**
 * Exports the active tab's Marp slide deck, including unsaved edits, after
 * asking where. Does nothing while another export runs.
 *
 * @param format The format the user chose, before the dialog: the save
 *               dialogs on Linux keep the file name's extension when the user
 *               picks another filter.
 */
export async function exportSlideDeck( format: ExportFormat ) {
	flushPendingEdits();
	const tab = select( tabsStore )
		.getTabs()
		.find( ( t ) => t.id === select( tabsStore ).getActiveTabId() );
	if ( exportStatus !== 'idle' || ! tab || ! isMarpDocument( tab.content ) ) {
		return;
	}

	setExportStatus( 'busy' );
	const title = __( 'Export Slide Deck', 'mark-bricks' );
	let fileName: string | null;
	let unlisten: ( () => void ) | undefined;
	try {
		unlisten = await listen( 'slide-deck-exporting', () =>
			setExportStatus( 'printing' )
		);
		let request;
		if ( format === 'html' ) {
			const { renderHtmlDocument } =
				await import( '@mark-bricks/marp-preview/export' );
			request = { format, html: renderHtmlDocument( tab.content ) };
		} else {
			request = { format, markdown: tab.content };
		}
		fileName = await invoke< string | null >( 'export_slide_deck', {
			request,
			documentPath: tab.filePath ?? null,
			filterName:
				format === 'html'
					? __( 'HTML slide deck', 'mark-bricks' )
					: __( 'PDF slide deck', 'mark-bricks' ),
		} );
	} catch ( error ) {
		await message(
			sprintf(
				/* translators: %s: Error message. */
				__( 'Could not export the slide deck: %s', 'mark-bricks' ),
				String( error )
			),
			{ title, kind: 'error' }
		);
		return;
	} finally {
		unlisten?.();
		setExportStatus( 'idle' );
	}
	if ( fileName ) {
		await message(
			sprintf(
				/* translators: %s: Name of the exported file. */
				__( 'Exported the slide deck to %s.', 'mark-bricks' ),
				fileName
			),
			{ title, kind: 'info' }
		);
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
