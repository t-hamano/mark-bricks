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
import { dispatch, select } from '@wordpress/data';

/**
 * Internal dependencies
 */
import ReloadPromptDialog from '.';
import tabsStore from '../../store';
import { closeTab, handleDocumentChange } from '../../actions';

const mocks = vi.hoisted( () => ( {
	root: vi.fn(),
	popup: vi.fn(),
} ) );

vi.mock( '@wordpress/ui', () => ( {
	AlertDialog: {
		Root: ( props: { children: unknown } ) => {
			mocks.root( props );
			return props.children;
		},
		Popup: ( props: unknown ) => {
			mocks.popup( props );
			return null;
		},
		Portal: () => null,
	},
	getWpCompatOverlaySlot: () => null,
} ) );

let root: Root;

type DialogProps = {
	onConfirm: () => void;
	onOpenChange: ( open: boolean ) => void;
};

function lastDialog() {
	return mocks.root.mock.lastCall?.[ 0 ] as DialogProps;
}

function lastDescription() {
	return ( mocks.popup.mock.lastCall?.[ 0 ] as { description: string } )
		.description;
}

function tabFor( documentId: string ) {
	const tab = select( tabsStore )
		.getTabs()
		.find( ( t ) => t.documentId === documentId );
	if ( ! tab ) {
		throw new Error( `Expected a tab for ${ documentId }` );
	}
	return tab;
}

// Opens `name` with unsaved changes and reports an outside change to it.
function changeDirtyFile( name: string ) {
	dispatch( tabsStore ).openFileTab( `/docs/${ name }.md`, 'original', name );
	const id = tabFor( name ).id;
	dispatch( tabsStore ).setTabContent( id, 'unsaved' );
	dispatch( tabsStore ).setTabDirty( id, true );
	return handleDocumentChange( {
		documentId: name,
		revision: 1,
		contents: 'outside',
	} );
}

beforeEach( async () => {
	vi.stubGlobal( 'IS_REACT_ACT_ENVIRONMENT', true );
	vi.clearAllMocks();
	for ( const tab of select( tabsStore ).getTabs() ) {
		dispatch( tabsStore ).closeTab( tab.id );
	}
	mockIPC( () => null );
	root = createRoot( document.createElement( 'div' ) );
	await act( async () => root.render( <ReloadPromptDialog /> ) );
} );

afterEach( async () => {
	await act( async () => root.unmount() );
	clearMocks();
	vi.unstubAllGlobals();
} );

it( 'reloads on confirm and keeps the edits on cancel', async () => {
	let handling: Promise< void > = Promise.resolve();
	await act( async () => {
		handling = changeDirtyFile( 'first' );
	} );
	expect( lastDescription() ).toBe(
		'"first.md" changed on disk. Reload it and discard your changes, or keep your version?'
	);
	await act( async () => lastDialog().onConfirm() );
	await handling;
	expect( tabFor( 'first' ) ).toMatchObject( {
		content: 'outside',
		isDirty: false,
	} );

	await act( async () => {
		handling = changeDirtyFile( 'second' );
	} );
	await act( async () => lastDialog().onOpenChange( false ) );
	await handling;
	expect( tabFor( 'second' ) ).toMatchObject( {
		content: 'unsaved',
		isDirty: true,
	} );
} );

it( 'does not let a closing dialog answer the next prompt', async () => {
	const handling: Promise< void >[] = [];
	await act( async () => {
		handling.push(
			changeDirtyFile( 'first' ),
			changeDirtyFile( 'second' )
		);
	} );
	const first = lastDialog();
	await act( async () => first.onConfirm() );
	// The confirmed dialog closes after its prompt is answered.
	await act( async () => first.onOpenChange( false ) );
	await handling[ 0 ];
	expect( select( tabsStore ).getReloadPromptId() ).toBe( 'second' );
	expect( lastDescription() ).toContain( '"second.md"' );
	await act( async () => lastDialog().onConfirm() );
	await Promise.all( handling );
	expect( tabFor( 'second' ) ).toMatchObject( {
		content: 'outside',
		isDirty: false,
	} );
} );

it( 'drops the prompt when its tab closes', async () => {
	let handling: Promise< void > = Promise.resolve();
	await act( async () => {
		handling = changeDirtyFile( 'first' );
	} );
	await act( async () => closeTab( tabFor( 'first' ).id ) );
	await handling;
	expect( select( tabsStore ).getReloadPromptId() ).toBeNull();
} );
