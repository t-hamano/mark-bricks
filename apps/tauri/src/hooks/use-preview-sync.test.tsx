/**
 * External dependencies
 */
import { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { EditorHandle } from '@mark-bricks/editor';

/**
 * Internal dependencies
 */
import usePreviewSync from './use-preview-sync';
import type { Tab } from '../store';

const mocks = vi.hoisted( () => ( {
	emitTo: vi.fn(),
	listen: vi.fn(),
} ) );

vi.mock( '@tauri-apps/api/event', () => ( {
	emitTo: mocks.emitTo,
	listen: mocks.listen,
} ) );

const MARP: Tab = {
	id: 'a',
	title: 'a',
	isDirty: false,
	content: '---\nmarp: true\n---\n\nA\n',
};
const PLAIN: Tab = { ...MARP, content: 'A\n' };

let root: Root;
const listeners = new Map< string, ( event: unknown ) => void >();
const editorRef = createRef< EditorHandle >();
const selectLine = vi.fn();
let onSelectedLineChange: ( line: number | null ) => void;

function TestHook( { tab }: { tab: Tab } ) {
	onSelectedLineChange = usePreviewSync( tab, editorRef );
	return null;
}

async function render( tab: Tab ) {
	await act( async () => root.render( <TestHook tab={ tab } /> ) );
}

function emitted( event: string ) {
	return mocks.emitTo.mock.calls
		.filter( ( [ , name ] ) => name === event )
		.map( ( [ , , payload ] ) => payload );
}

beforeEach( () => {
	vi.stubGlobal( 'IS_REACT_ACT_ENVIRONMENT', true );
	vi.clearAllMocks();
	listeners.clear();
	mocks.listen.mockImplementation( async ( event, callback ) => {
		listeners.set( event, callback );
		return () => {};
	} );
	( editorRef as { current: EditorHandle } ).current = {
		flush: vi.fn(),
		selectLine,
	};
	root = createRoot( document.createElement( 'div' ) );
} );

afterEach( async () => {
	await act( async () => root.unmount() );
	vi.unstubAllGlobals();
} );

it( 'sends the line of the selected block to the preview', async () => {
	await render( MARP );
	act( () => onSelectedLineChange( 4 ) );
	expect( emitted( 'preview-selected-line' ) ).toEqual( [ { line: 4 } ] );
} );

it( 'sends the document and the selected line when the preview opens', async () => {
	await render( MARP );
	act( () => onSelectedLineChange( 4 ) );
	mocks.emitTo.mockClear();

	listeners.get( 'preview-ready' )?.( {} );
	expect( emitted( 'preview-document' ) ).toEqual( [
		{ markdown: MARP.content, documentPath: undefined },
	] );
	expect( emitted( 'preview-selected-line' ) ).toEqual( [ { line: 4 } ] );
} );

it( 'selects the block of a clicked slide', async () => {
	await render( MARP );
	listeners.get( 'preview-line-click' )?.( { payload: { line: 4 } } );
	expect( selectLine ).toHaveBeenCalledExactlyOnceWith( 4 );
} );

it( 'ignores clicks with no valid line', async () => {
	await render( MARP );
	for ( const line of [ null, -1, 1.5, '4' ] ) {
		listeners.get( 'preview-line-click' )?.( { payload: { line } } );
	}
	expect( selectLine ).not.toHaveBeenCalled();
} );

it( 'ignores clicks when the document is not a Marp slide deck', async () => {
	await render( PLAIN );
	listeners.get( 'preview-line-click' )?.( { payload: { line: 0 } } );
	expect( selectLine ).not.toHaveBeenCalled();
} );
