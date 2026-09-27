/**
 * External dependencies
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
	openDocument,
	openFile,
	saveTab,
	saveTabAs,
	setEditorFlush,
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
		mockIPC( () => {
			throw new Error( 'Unknown or closed document' );
		} );
		await expect( saveTab( id ) ).rejects.toThrow(
			'Unknown or closed document'
		);
		expect( activeTab().isDirty ).toBe( true );
	} );
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
