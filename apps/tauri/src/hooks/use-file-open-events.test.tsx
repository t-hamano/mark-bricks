/**
 * External dependencies
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

/**
 * Internal dependencies
 */
import useFileOpenEvents from './use-file-open-events';

const mocks = vi.hoisted( () => ( {
	invoke: vi.fn(),
	listen: vi.fn(),
	openDocument: vi.fn(),
	message: vi.fn(),
} ) );

vi.mock( '@tauri-apps/api/core', () => ( { invoke: mocks.invoke } ) );
vi.mock( '@tauri-apps/api/event', () => ( { listen: mocks.listen } ) );
vi.mock( '@tauri-apps/plugin-dialog', () => ( { message: mocks.message } ) );
vi.mock( '../actions', () => ( { openDocument: mocks.openDocument } ) );

let root: Root;
let onOpen: ( event: unknown ) => void;
const unlisten = vi.fn();

function TestHook() {
	useFileOpenEvents();
	return null;
}

beforeEach( () => {
	vi.stubGlobal( 'IS_REACT_ACT_ENVIRONMENT', true );
	vi.clearAllMocks();
	mocks.invoke.mockResolvedValue( [] );
	mocks.listen.mockImplementation( async ( event, callback ) => {
		expect( event ).toBe( 'open-files' );
		onOpen = callback;
		return unlisten;
	} );
	root = createRoot( document.createElement( 'div' ) );
} );

afterEach( async () => {
	await act( async () => root.unmount() );
	expect( unlisten ).toHaveBeenCalledOnce();
	vi.unstubAllGlobals();
} );

it( 'opens only documents returned by the native startup queue', async () => {
	const document = {
		documentId: 'approved-1',
		path: '/docs/selected.md',
		contents: 'text',
	};
	mocks.invoke.mockResolvedValueOnce( [ { path: document.path, document } ] );
	await act( async () => root.render( <TestHook /> ) );
	expect( mocks.invoke ).toHaveBeenCalledExactlyOnceWith(
		'take_pending_documents'
	);
	expect( mocks.openDocument ).toHaveBeenCalledExactlyOnceWith( document );
} );

it( 'does not turn a forged event payload into file access', async () => {
	await act( async () => root.render( <TestHook /> ) );
	await act( async () => onOpen( { payload: [ '/private/secret.md' ] } ) );
	expect( mocks.invoke.mock.calls ).toEqual( [
		[ 'take_pending_documents' ],
		[ 'take_pending_documents' ],
	] );
	expect( mocks.openDocument ).not.toHaveBeenCalled();
} );
