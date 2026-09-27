/**
 * External dependencies
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { clearMocks, mockIPC } from '@tauri-apps/api/mocks';

/**
 * WordPress dependencies
 */
import { dispatch, select, useSelect } from '@wordpress/data';

/**
 * Internal dependencies
 */
import DirtyConfirmDialog from '.';
import tabsStore from '../../store';
import useAppCloseGuard from '../../hooks/use-app-close-guard';

const mocks = vi.hoisted( () => ( {
	onCloseRequested: vi.fn(),
	destroy: vi.fn(),
	root: vi.fn(),
} ) );

vi.mock( '@tauri-apps/api/window', () => ( {
	getCurrentWindow: () => mocks,
} ) );
vi.mock( '@wordpress/ui', () => ( {
	AlertDialog: { Root: mocks.root, Popup: () => null, Portal: () => null },
	getWpCompatOverlaySlot: () => null,
} ) );

let root: Root;
let requestClose: ( event: { preventDefault: () => void } ) => void;
let dialog: {
	onConfirm: () => Promise< void >;
	onOpenChange: ( open: boolean ) => void;
};

function TestApp() {
	const props = useSelect(
		( storeSelect ) => ( {
			tabs: storeSelect( tabsStore ).getTabs(),
			pendingCloseId: storeSelect( tabsStore ).getPendingCloseId(),
		} ),
		[]
	);
	useAppCloseGuard( props );
	return <DirtyConfirmDialog />;
}

beforeEach( () => {
	vi.stubGlobal( 'IS_REACT_ACT_ENVIRONMENT', true );
	vi.clearAllMocks();
	for ( const tab of select( tabsStore ).getTabs() ) {
		dispatch( tabsStore ).closeTab( tab.id );
	}
	mocks.onCloseRequested.mockImplementation( async ( callback ) => {
		requestClose = callback;
		return () => {};
	} );
	mocks.root.mockImplementation( ( props ) => {
		dialog = props;
		return null;
	} );
	root = createRoot( document.createElement( 'div' ) );
} );

afterEach( async () => {
	await act( async () => root.unmount() );
	clearMocks();
	vi.unstubAllGlobals();
} );

it( 'keeps the next confirmation when an earlier discard finishes or closes its dialog', async () => {
	for ( const name of [ 'first', 'second' ] ) {
		dispatch( tabsStore ).openFileTab(
			`/docs/${ name }.md`,
			'edits',
			name
		);
		dispatch( tabsStore ).setTabDirty(
			select( tabsStore ).getActiveTabId()!,
			true
		);
	}
	const [ first, second ] = select( tabsStore ).getTabs();
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
	await act( async () => root.render( <TestApp /> ) );
	const preventDefault = vi.fn();
	await act( async () => requestClose( { preventDefault } ) );
	expect( preventDefault ).toHaveBeenCalledOnce();
	expect( select( tabsStore ).getPendingCloseId() ).toBe( first.id );
	const firstDialog = dialog;
	let discarded!: Promise< void >;
	await act( async () => {
		discarded = firstDialog.onConfirm();
	} );
	expect( select( tabsStore ).getPendingCloseId() ).toBe( second.id );
	await act( async () => {
		finish();
		await discarded;
		firstDialog.onOpenChange( false );
	} );
	expect( select( tabsStore ).getPendingCloseId() ).toBe( second.id );
	expect( mocks.destroy ).not.toHaveBeenCalled();
	await act( async () => dialog.onConfirm() );
	expect( select( tabsStore ).getTabs() ).toHaveLength( 0 );
	expect( mocks.destroy ).toHaveBeenCalledOnce();
} );

it( 'cancels the app close when the current confirmation is dismissed', async () => {
	dispatch( tabsStore ).openTab();
	const id = select( tabsStore ).getActiveTabId()!;
	dispatch( tabsStore ).setTabDirty( id, true );
	await act( async () => root.render( <TestApp /> ) );
	await act( async () => requestClose( { preventDefault: vi.fn() } ) );
	await act( async () => dialog.onOpenChange( false ) );
	expect( select( tabsStore ).getPendingCloseId() ).toBeNull();
	expect( select( tabsStore ).getTabs() ).toHaveLength( 1 );
	expect( mocks.destroy ).not.toHaveBeenCalled();
} );
