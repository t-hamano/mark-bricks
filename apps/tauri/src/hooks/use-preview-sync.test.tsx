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
import usePreviewSync, { type PreviewSync } from './use-preview-sync';
import type { PreviewCommand, PreviewEvent } from '../preview/constants';
import type { Tab } from '../store';

const mocks = vi.hoisted( () => ( {
	isFullscreen: vi.fn(),
	setFullscreen: vi.fn(),
	onResized: vi.fn(),
} ) );

vi.mock( '@tauri-apps/api/window', () => ( {
	getCurrentWindow: () => ( {
		isFullscreen: mocks.isFullscreen,
		setFullscreen: mocks.setFullscreen,
		onResized: mocks.onResized,
	} ),
} ) );

vi.mock( '../preview/render', () => ( {
	renderSlides: ( markdown: string ) => ( { html: markdown, css: '' } ),
} ) );

const MARP: Tab = {
	id: 'a',
	title: 'a',
	isDirty: false,
	content: '---\nmarp: true\n---\n\nA\n',
};
const PLAIN: Tab = { ...MARP, content: 'A\n' };

let root: Root;
let frame: HTMLIFrameElement;
let sent: PreviewCommand[];
let onResized: () => Promise< void >;
const editorRef = createRef< EditorHandle >();
const selectLine = vi.fn();
let sync: PreviewSync;

function TestHook( { tab }: { tab: Tab } ) {
	sync = usePreviewSync( tab, editorRef );
	( sync.frameRef as { current: HTMLIFrameElement } ).current = frame;
	return null;
}

async function render( tab: Tab ) {
	await act( async () => root.render( <TestHook tab={ tab } /> ) );
}

async function receive( data: PreviewEvent | Record< string, unknown > ) {
	await act( async () => {
		window.dispatchEvent(
			new MessageEvent( 'message', {
				data,
				origin: location.origin,
				source: frame.contentWindow,
			} )
		);
	} );
}

function sentOf< T extends PreviewCommand[ 'type' ] >( type: T ) {
	return sent.filter( ( command ) => command.type === type );
}

beforeEach( () => {
	vi.stubGlobal( 'IS_REACT_ACT_ENVIRONMENT', true );
	vi.stubGlobal( 'requestAnimationFrame', ( callback: () => void ) => {
		queueMicrotask( callback );
		return 1;
	} );
	vi.clearAllMocks();
	mocks.isFullscreen.mockResolvedValue( false );
	mocks.setFullscreen.mockResolvedValue( undefined );
	mocks.onResized.mockImplementation( async ( callback ) => {
		onResized = callback;
		return () => {};
	} );
	frame = document.createElement( 'iframe' );
	document.body.append( frame );
	sent = [];
	vi.spyOn( frame.contentWindow!, 'postMessage' ).mockImplementation(
		( command ) => sent.push( command as PreviewCommand )
	);
	( editorRef as { current: EditorHandle } ).current = {
		flush: vi.fn(),
		selectLine,
	};
	root = createRoot( document.createElement( 'div' ) );
} );

afterEach( async () => {
	await act( async () => root.unmount() );
	frame.remove();
	vi.unstubAllGlobals();
} );

it( 'sends the slides of the document to the preview', async () => {
	await render( MARP );
	expect( sentOf( 'slides' ) ).toEqual( [
		{ type: 'slides', slides: { html: MARP.content, css: '' } },
	] );
} );

it( 'sends the line of the selected block to the preview', async () => {
	await render( MARP );
	act( () => sync.onSelectedLineChange( 4 ) );
	expect( sentOf( 'selected-line' ) ).toEqual( [
		{ type: 'selected-line', line: 4 },
	] );
} );

it( 'sends the slides and the selected line when the preview loads', async () => {
	await render( MARP );
	act( () => sync.onSelectedLineChange( 4 ) );
	sent = [];

	await receive( { type: 'ready' } );
	expect( sentOf( 'slides' ) ).toHaveLength( 1 );
	expect( sentOf( 'selected-line' ) ).toEqual( [
		{ type: 'selected-line', line: 4 },
	] );
} );

it( 'ignores messages from other windows', async () => {
	await render( MARP );
	await act( async () => {
		window.dispatchEvent(
			new MessageEvent( 'message', {
				data: { type: 'line-click', line: 4 },
				origin: location.origin,
				source: window,
			} )
		);
	} );
	expect( selectLine ).not.toHaveBeenCalled();
} );

it( 'selects the block of a clicked slide', async () => {
	await render( MARP );
	await receive( { type: 'line-click', line: 4 } );
	expect( selectLine ).toHaveBeenCalledExactlyOnceWith( 4 );
} );

it( 'ignores clicks with no valid line', async () => {
	await render( MARP );
	for ( const line of [ null, -1, 1.5, '4' ] ) {
		await receive( { type: 'line-click', line } );
	}
	expect( selectLine ).not.toHaveBeenCalled();
} );

it( 'ignores clicks when the document is not a Marp slide deck', async () => {
	await render( PLAIN );
	await receive( { type: 'line-click', line: 0 } );
	expect( selectLine ).not.toHaveBeenCalled();
} );

it( 'forgets the selected line when the active tab changes', async () => {
	await render( MARP );
	act( () => sync.onSelectedLineChange( 4 ) );
	sent = [];

	await render( { ...MARP, id: 'b' } );
	expect( sentOf( 'selected-line' ) ).toEqual( [
		{ type: 'selected-line', line: null },
	] );
} );

it( 'fills the window in full screen in the slide mode', async () => {
	await render( MARP );
	await receive( { type: 'slide-mode-request', enabled: true } );
	expect( sync.isSlideMode ).toBe( true );
	expect( sentOf( 'slide-mode' ) ).toEqual( [
		{ type: 'slide-mode', enabled: true },
	] );
	expect( mocks.setFullscreen ).toHaveBeenCalledExactlyOnceWith( true );

	await receive( { type: 'slide-mode-request', enabled: false } );
	expect( sync.isSlideMode ).toBe( false );
	expect( mocks.setFullscreen ).toHaveBeenLastCalledWith( false );
} );

it( 'keeps a window that was in full screen there', async () => {
	mocks.isFullscreen.mockResolvedValue( true );
	await render( MARP );
	await receive( { type: 'slide-mode-request', enabled: true } );
	await receive( { type: 'slide-mode-request', enabled: false } );
	expect( mocks.setFullscreen ).not.toHaveBeenCalled();
} );

it( 'leaves the slide mode when a new preview loads', async () => {
	await render( MARP );
	await receive( { type: 'slide-mode-request', enabled: true } );
	await receive( { type: 'ready' } );
	expect( sync.isSlideMode ).toBe( false );
	expect( mocks.setFullscreen ).toHaveBeenLastCalledWith( false );
} );

it( 'leaves the slide mode when a full screen it did not enter ends', async () => {
	mocks.isFullscreen.mockResolvedValue( true );
	await render( MARP );
	await receive( { type: 'slide-mode-request', enabled: true } );

	mocks.isFullscreen.mockResolvedValue( false );
	await act( () => onResized() );
	expect( sync.isSlideMode ).toBe( false );
	expect( mocks.setFullscreen ).not.toHaveBeenCalled();
} );

it( 'leaves the slide mode when full screen ends', async () => {
	await render( MARP );
	await receive( { type: 'slide-mode-request', enabled: true } );
	sent = [];

	await act( () => onResized() );
	expect( sync.isSlideMode ).toBe( false );
	expect( sentOf( 'slide-mode' ) ).toEqual( [
		{ type: 'slide-mode', enabled: false },
	] );
} );
