/**
 * External dependencies
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emit } from '@tauri-apps/api/event';
import { clearMocks, mockIPC } from '@tauri-apps/api/mocks';

/**
 * WordPress dependencies
 */
import { dispatch, select } from '@wordpress/data';

/**
 * Internal dependencies
 */
import tabsStore from '../store';
import {
	closeTab,
	closeOtherTabs,
	exportSlideDeck,
	getExportStatus,
	openDocument,
	openFile,
	saveTab,
	saveTabAs,
	setEditorFlush,
	subscribeExportStatus,
	type ExportFormat,
} from '.';

const selected = {
	documentId: 'approved-1',
	path: '/docs/selected.md',
	contents: 'original',
};

beforeEach( () => {
	for ( const tab of select( tabsStore ).getTabs() ) {
		dispatch( tabsStore ).closeTab( tab.id );
	}
	mockIPC( () => null );
} );

afterEach( () => {
	setEditorFlush( null );
	clearMocks();
} );

function activeTab() {
	const tab = select( tabsStore )
		.getTabs()
		.find( ( t ) => t.id === select( tabsStore ).getActiveTabId() );
	if ( ! tab ) {
		throw new Error( 'Expected an active tab' );
	}
	return tab;
}

describe( 'openDocument', () => {
	it( 'focuses a duplicate without reading and releases only its extra reference', async () => {
		await openDocument( selected );
		const id = activeTab().id;
		dispatch( tabsStore ).setTabContent( id, 'unsaved' );
		dispatch( tabsStore ).setTabDirty( id, true );
		dispatch( tabsStore ).openTab();
		const calls: unknown[] = [];
		mockIPC( ( cmd, payload ) => calls.push( { cmd, payload } ) );
		await openDocument( { ...selected, contents: null } );
		expect( activeTab() ).toMatchObject( {
			id,
			content: 'unsaved',
			isDirty: true,
		} );
		expect( calls ).toEqual( [
			{
				cmd: 'close_document',
				payload: { documentId: selected.documentId },
			},
		] );
	} );

	it( 'reads a retained duplicate grant if its previous tab has closed', async () => {
		const calls: unknown[] = [];
		mockIPC( ( cmd, payload ) => {
			calls.push( { cmd, payload } );
			return 'loaded';
		} );
		await openDocument( { ...selected, contents: null } );
		expect( calls ).toEqual( [
			{
				cmd: 'read_document',
				payload: { documentId: selected.documentId },
			},
		] );
		expect( activeTab().content ).toBe( 'loaded' );
	} );

	it( 'rechecks tabs after a deferred read and releases a failed read grant', async () => {
		const released: unknown[] = [];
		mockIPC( async ( cmd, payload ) => {
			if ( cmd === 'read_document' ) {
				await openDocument( selected );
				return 'stale';
			}
			released.push( payload );
		} );
		await openDocument( { ...selected, contents: null } );
		expect( select( tabsStore ).getTabs() ).toHaveLength( 1 );
		expect( activeTab().content ).toBe( 'original' );
		await closeTab( activeTab().id );
		mockIPC( ( cmd, payload ) => {
			if ( cmd === 'read_document' ) {
				throw 'read failed';
			}
			released.push( payload );
		} );
		await expect(
			openDocument( { ...selected, contents: null } )
		).rejects.toBe( 'read failed' );
		expect( released ).toHaveLength( 3 );
		expect( select( tabsStore ).getTabs() ).toHaveLength( 0 );
	} );
	it( 'opens the document returned by the native picker without sending a path', async () => {
		const calls: unknown[] = [];
		mockIPC( ( cmd, payload ) => {
			calls.push( { cmd, payload } );
			return selected;
		} );
		await openFile();
		expect( calls ).toEqual( [ { cmd: 'open_document', payload: {} } ] );
		expect( activeTab() ).toMatchObject( {
			documentId: selected.documentId,
			filePath: selected.path,
			content: selected.contents,
			isDirty: false,
		} );
	} );

	it( 'leaves tabs unchanged when the picker is cancelled', async () => {
		await openFile();
		expect( select( tabsStore ).getTabs() ).toHaveLength( 0 );
	} );

	it( 'replaces a lone blank tab', async () => {
		dispatch( tabsStore ).openTab();
		const blankId = activeTab().id;
		await openDocument( selected );
		expect( select( tabsStore ).getTabs() ).toHaveLength( 1 );
		expect( activeTab().id ).not.toBe( blankId );
	} );

	it( 'retains multiple blank tabs', async () => {
		dispatch( tabsStore ).openTab();
		dispatch( tabsStore ).openTab();
		await openDocument( selected );
		expect( select( tabsStore ).getTabs() ).toHaveLength( 3 );
	} );

	it( 'releases a duplicate grant and preserves unsaved edits', async () => {
		await openDocument( selected );
		const id = activeTab().id;
		dispatch( tabsStore ).setTabContent( id, 'unsaved' );
		dispatch( tabsStore ).setTabDirty( id, true );
		const calls: unknown[] = [];
		mockIPC( ( cmd, payload ) => calls.push( { cmd, payload } ) );
		await openDocument( { ...selected, documentId: 'approved-2' } );
		expect( calls ).toEqual( [
			{ cmd: 'close_document', payload: { documentId: 'approved-2' } },
		] );
		expect( activeTab() ).toMatchObject( {
			id,
			content: 'unsaved',
			isDirty: true,
			documentId: 'approved-1',
		} );
		expect( select( tabsStore ).getTabs() ).toHaveLength( 1 );
	} );
} );

describe( 'saveTab', () => {
	it( 'serializes saves so the last edit reaches disk last', async () => {
		await openDocument( selected );
		const id = activeTab().id;
		const writes: string[] = [];
		const complete: ( () => void )[] = [];
		let disk = selected.contents;
		mockIPC( ( cmd, payload ) => {
			if ( cmd === 'write_document' ) {
				const { contents } = payload as { contents: string };
				writes.push( contents );
				return new Promise( ( resolve ) =>
					complete.push( () => {
						disk = contents;
						resolve( null );
					} )
				);
			}
		} );
		dispatch( tabsStore ).setTabContent( id, 'A' );
		dispatch( tabsStore ).setTabDirty( id, true );
		const first = saveTab( id );
		dispatch( tabsStore ).setTabContent( id, 'B' );
		const second = saveTab( id );
		expect( writes ).toEqual( [ 'A' ] );
		complete[ 0 ]();
		await first;
		expect( activeTab().isDirty ).toBe( true );
		expect( writes ).toEqual( [ 'A', 'B' ] );
		complete[ 1 ]();
		await second;
		expect( disk ).toBe( 'B' );
		expect( activeTab().isDirty ).toBe( false );
	} );

	it( 'continues a save queue after failure without blocking other tabs', async () => {
		await openDocument( selected );
		const firstId = activeTab().id;
		await openDocument( {
			...selected,
			path: '/docs/other.md',
			documentId: 'other',
		} );
		const secondId = activeTab().id;
		let fail!: () => void;
		let attempts = 0;
		mockIPC( ( cmd, payload ) => {
			if (
				cmd === 'write_document' &&
				( payload as { documentId: string } ).documentId ===
					selected.documentId
			) {
				if ( attempts++ === 0 ) {
					return new Promise( ( _, reject ) => {
						fail = () => reject( 'failed' );
					} );
				}
			}
		} );
		const first = saveTab( firstId );
		const failed = expect( first ).rejects.toBe( 'failed' );
		const retry = saveTab( firstId );
		expect( await saveTab( secondId ) ).toBe( true );
		expect( attempts ).toBe( 1 );
		fail();
		await failed;
		expect( await retry ).toBe( true );
		expect( attempts ).toBe( 2 );
	} );

	it( 'queues Save As and resolves subsequent saves against the new grant', async () => {
		await openDocument( selected );
		const id = activeTab().id;
		let finish!: () => void;
		const calls: unknown[] = [];
		mockIPC( ( cmd, payload ) => {
			calls.push( { cmd, payload } );
			if ( cmd === 'save_document_as' ) {
				return new Promise( ( resolve ) => {
					finish = () =>
						resolve( { documentId: 'new', path: '/docs/new.md' } );
				} );
			}
		} );
		const saveAs = saveTabAs( id );
		dispatch( tabsStore ).setTabContent( id, 'edited' );
		dispatch( tabsStore ).setTabDirty( id, true );
		const save = saveTab( id );
		expect( calls ).toHaveLength( 1 );
		finish();
		await Promise.all( [ saveAs, save ] );
		expect( calls ).toEqual( [
			{ cmd: 'save_document_as', payload: { contents: 'original' } },
			{ cmd: 'close_document', payload: { documentId: 'approved-1' } },
			{
				cmd: 'write_document',
				payload: { documentId: 'new', contents: 'edited' },
			},
		] );
		expect( activeTab().isDirty ).toBe( false );
	} );
	it( 'saves using only the native ID even if the frontend path is changed', async () => {
		await openDocument( selected );
		const id = activeTab().id;
		dispatch( tabsStore ).setTabFile(
			id,
			'/private/secret.txt',
			selected.documentId
		);
		dispatch( tabsStore ).setTabContent( id, 'edited' );
		dispatch( tabsStore ).setTabDirty( id, true );
		const calls: unknown[] = [];
		mockIPC( ( cmd, payload ) => calls.push( { cmd, payload } ) );
		expect( await saveTab( id ) ).toBe( true );
		expect( calls ).toEqual( [
			{
				cmd: 'write_document',
				payload: { documentId: 'approved-1', contents: 'edited' },
			},
		] );
		expect( activeTab().isDirty ).toBe( false );
	} );

	it( 'flushes pending editor changes before saving', async () => {
		await openDocument( selected );
		const id = activeTab().id;
		setEditorFlush( () =>
			dispatch( tabsStore ).setTabContent( id, 'flushed' )
		);
		const writes: unknown[] = [];
		mockIPC( ( cmd, payload ) => {
			if ( cmd === 'write_document' ) {
				writes.push( payload );
			}
		} );
		await saveTab( id );
		expect( writes ).toEqual( [
			{ documentId: 'approved-1', contents: 'flushed' },
		] );
	} );

	it( 'preserves the dirty flag when native authorization fails', async () => {
		await openDocument( selected );
		const id = activeTab().id;
		dispatch( tabsStore ).setTabDirty( id, true );
		const error = { code: 'other', message: 'Unknown or closed document' };
		const calls: string[] = [];
		mockIPC( ( cmd ) => {
			calls.push( cmd );
			throw error;
		} );
		await expect( saveTab( id ) ).rejects.toEqual( error );
		expect( calls ).toEqual( [ 'write_document' ] );
		expect( activeTab().isDirty ).toBe( true );
	} );

	it( 'opens Save As directly when the original file is missing or replaced', async () => {
		await openDocument( selected );
		const id = activeTab().id;
		dispatch( tabsStore ).setTabContent( id, 'unsaved edits' );
		dispatch( tabsStore ).setTabDirty( id, true );
		const calls: unknown[] = [];
		mockIPC( ( cmd, payload ) => {
			calls.push( { cmd, payload } );
			if ( cmd === 'write_document' ) {
				throw { code: 'save_as_required' };
			}
			if ( cmd === 'save_document_as' ) {
				return { documentId: 'approved-2', path: '/docs/recovered.md' };
			}
		} );
		expect( await saveTab( id ) ).toBe( true );
		expect( calls ).toEqual( [
			{
				cmd: 'write_document',
				payload: {
					documentId: 'approved-1',
					contents: 'unsaved edits',
				},
			},
			{ cmd: 'save_document_as', payload: { contents: 'unsaved edits' } },
			{ cmd: 'close_document', payload: { documentId: 'approved-1' } },
		] );
		expect( activeTab() ).toMatchObject( {
			content: 'unsaved edits',
			documentId: 'approved-2',
			filePath: '/docs/recovered.md',
			isDirty: false,
		} );
	} );

	it( 'preserves the edits and original grant when recovery is cancelled', async () => {
		await openDocument( selected );
		const id = activeTab().id;
		dispatch( tabsStore ).setTabContent( id, 'unsaved edits' );
		dispatch( tabsStore ).setTabDirty( id, true );
		const calls: string[] = [];
		mockIPC( ( cmd ) => {
			calls.push( cmd );
			if ( cmd === 'write_document' ) {
				throw { code: 'save_as_required' };
			}
			return null;
		} );
		expect( await saveTab( id ) ).toBe( false );
		expect( calls ).toEqual( [ 'write_document', 'save_document_as' ] );
		expect( activeTab() ).toMatchObject( {
			content: 'unsaved edits',
			documentId: selected.documentId,
			filePath: selected.path,
			isDirty: true,
		} );
	} );

	it( 'does not open recovery after the tab is closed', async () => {
		await openDocument( selected );
		const id = activeTab().id;
		const calls: string[] = [];
		mockIPC( ( cmd ) => {
			calls.push( cmd );
			dispatch( tabsStore ).closeTab( id );
			throw { code: 'save_as_required' };
		} );
		expect( await saveTab( id ) ).toBe( false );
		expect( calls ).toEqual( [ 'write_document' ] );
	} );
} );

it( 'flushes and rechecks later tabs after waiting for another tab to close', async () => {
	await openDocument( selected );
	const keepId = activeTab().id;
	await openDocument( {
		...selected,
		path: '/docs/first.md',
		documentId: 'first',
	} );
	await openDocument( {
		...selected,
		path: '/docs/later.md',
		documentId: 'later',
	} );
	const laterId = activeTab().id;
	let finish!: () => void;
	mockIPC( ( cmd, payload ) => {
		if (
			cmd === 'close_document' &&
			( payload as { documentId: string } ).documentId === 'first'
		) {
			return new Promise( ( resolve ) => {
				finish = () => resolve( null );
			} );
		}
	} );
	const closing = closeOtherTabs( keepId );
	dispatch( tabsStore ).setActiveTab( laterId );
	setEditorFlush( () => {
		dispatch( tabsStore ).setTabContent( laterId, 'new edits' );
		dispatch( tabsStore ).setTabDirty( laterId, true );
	} );
	finish();
	await closing;
	expect( select( tabsStore ).getPendingCloseId() ).toBe( laterId );
	expect( activeTab() ).toMatchObject( {
		id: laterId,
		content: 'new edits',
		isDirty: true,
	} );
	expect( select( tabsStore ).getTabs() ).toHaveLength( 2 );
} );

describe( 'saveTabAs', () => {
	it( 'releases a new grant while the previous grant is still closing', async () => {
		await openDocument( selected );
		const id = activeTab().id;
		let finishClose!: () => void;
		let closing!: Promise< void >;
		const released: unknown[] = [];
		mockIPC( ( cmd, payload ) => {
			if ( cmd === 'save_document_as' ) {
				closing = closeTab( id );
				return { documentId: 'approved-2', path: '/docs/new.md' };
			}
			released.push( payload );
			if (
				( payload as { documentId: string } ).documentId ===
				'approved-1'
			) {
				return new Promise( ( resolve ) => {
					finishClose = () => resolve( null );
				} );
			}
		} );
		const saved = await saveTabAs( id );
		finishClose();
		await closing;
		expect( saved ).toBe( false );
		expect( released ).toEqual( [
			{ documentId: 'approved-1' },
			{ documentId: 'approved-2' },
		] );
		expect( select( tabsStore ).getTabs() ).toHaveLength( 0 );
	} );

	it( 'does not attach a pending save to a replacement untitled tab', async () => {
		dispatch( tabsStore ).openTab();
		const id = activeTab().id;
		const released: unknown[] = [];
		mockIPC( ( cmd, payload ) => {
			if ( cmd === 'save_document_as' ) {
				dispatch( tabsStore ).closeTab( id );
				dispatch( tabsStore ).openTab();
				return { documentId: 'approved-2', path: '/docs/new.md' };
			}
			released.push( payload );
		} );
		expect( await saveTabAs( id ) ).toBe( false );
		expect( activeTab().id ).not.toBe( id );
		expect( activeTab().documentId ).toBeUndefined();
		expect( released ).toEqual( [ { documentId: 'approved-2' } ] );
	} );

	it( 'preserves the current grant on cancellation', async () => {
		await openDocument( selected );
		const id = activeTab().id;
		dispatch( tabsStore ).setTabDirty( id, true );
		expect( await saveTabAs( id ) ).toBe( false );
		expect( activeTab() ).toMatchObject( {
			documentId: 'approved-1',
			filePath: selected.path,
			isDirty: true,
		} );
	} );

	it( 'updates the grant and releases the previous one after saving', async () => {
		await openDocument( selected );
		const id = activeTab().id;
		dispatch( tabsStore ).setTabDirty( id, true );
		const calls: unknown[] = [];
		mockIPC( ( cmd, payload ) => {
			calls.push( { cmd, payload } );
			return { documentId: 'approved-2', path: '/docs/new.md' };
		} );
		expect( await saveTabAs( id ) ).toBe( true );
		expect( calls ).toEqual( [
			{ cmd: 'save_document_as', payload: { contents: 'original' } },
			{ cmd: 'close_document', payload: { documentId: 'approved-1' } },
		] );
		expect( activeTab() ).toMatchObject( {
			documentId: 'approved-2',
			filePath: '/docs/new.md',
			isDirty: false,
		} );
	} );

	it( 'preserves edits made while the native dialog is open', async () => {
		await openDocument( selected );
		const id = activeTab().id;
		mockIPC( ( cmd ) => {
			if ( cmd === 'save_document_as' ) {
				dispatch( tabsStore ).setTabContent( id, 'new edit' );
				dispatch( tabsStore ).setTabDirty( id, true );
				return { documentId: 'approved-2', path: '/docs/new.md' };
			}
		} );
		await saveTabAs( id );
		expect( activeTab() ).toMatchObject( {
			content: 'new edit',
			isDirty: true,
		} );
	} );

	it( 'releases the new grant if the tab was closed during the dialog', async () => {
		await openDocument( selected );
		const id = activeTab().id;
		const released: unknown[] = [];
		mockIPC( ( cmd, payload ) => {
			if ( cmd === 'save_document_as' ) {
				dispatch( tabsStore ).closeTab( id );
				return { documentId: 'approved-2', path: '/docs/new.md' };
			}
			released.push( payload );
		} );
		expect( await saveTabAs( id ) ).toBe( false );
		expect( released ).toEqual( [ { documentId: 'approved-2' } ] );
	} );
} );

it( 'revokes the native grant when closing a tab', async () => {
	await openDocument( selected );
	const calls: unknown[] = [];
	mockIPC( ( cmd, payload ) => calls.push( { cmd, payload } ) );
	await closeTab( activeTab().id );
	expect( calls ).toEqual( [
		{ cmd: 'close_document', payload: { documentId: 'approved-1' } },
	] );
	expect( select( tabsStore ).getTabs() ).toHaveLength( 0 );
} );

describe( 'exportSlideDeck', () => {
	const DECK = '---\nmarp: true\ntitle: Deck\n---\n\n# One\n';

	// Opens a deck from `/docs/deck.md` and records the IPC calls, except for
	// the events, answering the export with `exported`, the written file's
	// name. For a PDF, the export reports that it started printing, as the
	// native side does, and records the status then.
	async function exportDeck( {
		format = 'html' as ExportFormat,
		content = DECK,
		exported = 'deck.html' as string | null,
		error,
	}: {
		format?: ExportFormat;
		content?: string;
		exported?: string | null;
		error?: string;
	} = {} ) {
		await openDocument( {
			...selected,
			path: '/docs/deck.md',
			contents: content,
		} );
		const calls: { cmd: string; payload: unknown }[] = [];
		const statuses: string[] = [];
		mockIPC(
			async ( cmd, payload ) => {
				if ( ! cmd.startsWith( 'plugin:event|' ) ) {
					calls.push( { cmd, payload } );
				}
				if ( cmd === 'export_slide_deck' ) {
					statuses.push( getExportStatus() );
					if ( format === 'pdf' ) {
						await emit( 'slide-deck-exporting' );
						statuses.push( getExportStatus() );
					}
					if ( error ) {
						throw error;
					}
					return exported;
				}
				return null;
			},
			{ shouldMockEvents: true }
		);
		await exportSlideDeck( format );
		return { calls, statuses };
	}

	const exportPayload = ( calls: { cmd: string; payload: unknown }[] ) =>
		calls.find( ( c ) => c.cmd === 'export_slide_deck' )?.payload as {
			request: Record< string, string >;
			documentPath: string;
			filterName: string;
		};

	it( 'sends the rendered HTML for an HTML export', async () => {
		const { calls } = await exportDeck();
		const { request, documentPath, filterName } = exportPayload( calls );

		expect( request.format ).toBe( 'html' );
		expect( request.html ).toMatch( /^<!DOCTYPE html>/ );
		expect( request.html ).toContain( '<title>Deck</title>' );
		expect( request ).not.toHaveProperty( 'markdown' );
		expect( documentPath ).toBe( '/docs/deck.md' );
		expect( filterName ).toBe( 'HTML slide deck' );
	} );

	it( 'sends the Markdown for a PDF export', async () => {
		const { calls } = await exportDeck( {
			format: 'pdf',
			exported: 'deck.pdf',
		} );
		const { request, filterName } = exportPayload( calls );

		expect( request ).toEqual( { format: 'pdf', markdown: DECK } );
		expect( filterName ).toBe( 'PDF slide deck' );
	} );

	it( 'is busy during an export, and printing while a PDF prints', async () => {
		const { statuses } = await exportDeck( {
			format: 'pdf',
			exported: 'deck.pdf',
		} );
		expect( statuses ).toEqual( [ 'busy', 'printing' ] );
		expect( getExportStatus() ).toBe( 'idle' );
	} );

	it( 'tells subscribers when the status changes', async () => {
		const listener = vi.fn();
		const unsubscribe = subscribeExportStatus( listener );
		await exportDeck();
		unsubscribe();
		// Busy, then idle again.
		expect( listener ).toHaveBeenCalledTimes( 2 );
	} );

	it( 'ignores a second export while one runs', async () => {
		await openDocument( {
			...selected,
			path: '/docs/deck.md',
			contents: DECK,
		} );
		let finish: ( value: string ) => void = () => {};
		let exports = 0;
		mockIPC(
			( cmd ) => {
				if ( cmd !== 'export_slide_deck' ) {
					return null;
				}
				exports++;
				return new Promise( ( resolve ) => {
					finish = resolve;
				} );
			},
			{ shouldMockEvents: true }
		);

		const first = exportSlideDeck( 'pdf' );
		await vi.waitFor( () => expect( exports ).toBe( 1 ) );
		await exportSlideDeck( 'html' );
		finish( 'deck.pdf' );
		await first;

		expect( exports ).toBe( 1 );
	} );

	it( 'exports unsaved edits', async () => {
		await openDocument( {
			...selected,
			path: '/docs/deck.md',
			contents: DECK,
		} );
		const id = activeTab().id;
		setEditorFlush( () =>
			dispatch( tabsStore ).setTabContent(
				id,
				DECK.replace( 'title: Deck', 'title: Edited' )
			)
		);
		let html = '';
		mockIPC(
			( cmd, payload ) => {
				if ( cmd === 'export_slide_deck' ) {
					html = ( payload as { request: { html: string } } ).request
						.html;
				}
				return null;
			},
			{ shouldMockEvents: true }
		);

		await exportSlideDeck( 'html' );

		expect( html ).toContain( '<title>Edited</title>' );
	} );

	it( 'does nothing for a document that is not a Marp deck', async () => {
		const { calls } = await exportDeck( { content: '# Notes\n' } );
		expect( calls ).toEqual( [] );
	} );

	it( 'stops quietly when the dialog is canceled', async () => {
		const { calls } = await exportDeck( { exported: null } );
		expect( calls.map( ( c ) => c.cmd ) ).toEqual( [
			'export_slide_deck',
		] );
	} );

	it( 'tells which file it exported', async () => {
		const { calls } = await exportDeck();
		const shown = calls.find( ( c ) => c.cmd === 'plugin:dialog|message' );

		expect( shown?.payload ).toMatchObject( {
			message: 'Exported the slide deck to deck.html.',
			kind: 'info',
		} );
	} );

	it( 'shows why an export failed', async () => {
		const { calls } = await exportDeck( { error: 'Access is denied.' } );
		const shown = calls.find( ( c ) => c.cmd === 'plugin:dialog|message' );

		expect( shown?.payload ).toMatchObject( {
			message: 'Could not export the slide deck: Access is denied.',
			kind: 'error',
		} );
		expect( getExportStatus() ).toBe( 'idle' );
	} );
} );
