/**
 * External dependencies
 */
import { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EditorHandle } from '@mark-bricks/editor';

/**
 * Internal dependencies
 */
import usePreviewSync, { type PreviewSync } from './use-preview-sync';
import type {
	PreviewCommand,
	PreviewEvent,
	PreviewPlacement,
} from '../preview/constants';
import {
	setSlidePreviewPlacement,
	setSlidePreviewShown,
	useSlidePreviewPlacement,
	useSlidePreviewShown,
} from '../preview/visibility';
import type { Tab } from '../store';

const mocks = vi.hoisted( () => ( {
	emitTo: vi.fn(),
	listen: vi.fn(),
	invoke: vi.fn(),
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

vi.mock( '@tauri-apps/api/event', () => ( {
	emitTo: mocks.emitTo,
	listen: mocks.listen,
} ) );

vi.mock( '@tauri-apps/api/core', () => ( {
	invoke: mocks.invoke,
} ) );

// The editor's package root loads the whole editor, which this hook needs
// only for the locale.
vi.mock( '@mark-bricks/editor', () => ( {
	getLocale: () => 'en',
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

const listeners = new Map< string, ( event: unknown ) => void >();

type HookProps = { tab: Tab; placement?: PreviewPlacement; isShown?: boolean };

function TestHook( { tab, placement = 'panel', isShown = true }: HookProps ) {
	sync = usePreviewSync( tab, editorRef, isShown, placement );
	( sync.frameRef as { current: HTMLIFrameElement } ).current = frame;
	return null;
}

async function render( tab: Tab, options: Omit< HookProps, 'tab' > = {} ) {
	await act( async () =>
		root.render( <TestHook tab={ tab } { ...options } /> )
	);
}

function emitted() {
	return mocks.emitTo.mock.calls
		.filter(
			( [ label, event ] ) =>
				label === 'preview' && event === 'preview-command'
		)
		.map( ( [ , , command ] ) => command as PreviewCommand );
}

function isPreviewShown() {
	let value = false;
	function Probe() {
		value = useSlidePreviewShown();
		return null;
	}
	act( () =>
		createRoot( document.createElement( 'div' ) ).render( <Probe /> )
	);
	return value;
}

function previewPlacement() {
	let value: PreviewPlacement = 'panel';
	function Probe() {
		value = useSlidePreviewPlacement();
		return null;
	}
	act( () =>
		createRoot( document.createElement( 'div' ) ).render( <Probe /> )
	);
	return value;
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
	listeners.clear();
	mocks.listen.mockImplementation( async ( event, callback ) => {
		listeners.set( event, callback );
		return () => {};
	} );
	mocks.invoke.mockResolvedValue( undefined );
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

it( 'moves the preview to the place the preview asks for', async () => {
	await render( MARP );
	await receive( { type: 'placement-request', placement: 'window' } );
	expect( previewPlacement() ).toBe( 'window' );
	setSlidePreviewPlacement( 'panel' );
} );

describe( 'in a window', () => {
	beforeEach( () => {
		setSlidePreviewShown( true );
	} );

	it( 'opens the window, and closes it when the preview moves', async () => {
		await render( MARP, { placement: 'window' } );
		expect( mocks.invoke ).toHaveBeenLastCalledWith(
			'open_preview',
			expect.anything()
		);

		await render( MARP, { placement: 'panel' } );
		expect( mocks.invoke ).toHaveBeenLastCalledWith( 'close_preview' );
	} );

	it( 'does not open the window after the preview turns off', async () => {
		let finishOpen = () => {};
		mocks.invoke.mockImplementation( ( command ) =>
			command === 'open_preview'
				? new Promise< void >( ( resolve ) => {
						finishOpen = resolve;
					} )
				: Promise.resolve()
		);
		await render( MARP, { placement: 'window' } );
		await render( MARP, { placement: 'window', isShown: false } );
		expect( mocks.invoke ).not.toHaveBeenCalledWith( 'close_preview' );

		await act( async () => finishOpen() );
		expect( mocks.invoke ).toHaveBeenLastCalledWith( 'close_preview' );
	} );

	it( 'closes the window when the preview is off', async () => {
		await render( MARP, { placement: 'window' } );
		await render( MARP, { placement: 'window', isShown: false } );
		expect( mocks.invoke ).toHaveBeenLastCalledWith( 'close_preview' );
	} );

	it( 'sends the slides when the window loads', async () => {
		await render( MARP, { placement: 'window' } );
		act( () => sync.onSelectedLineChange( 4 ) );
		mocks.emitTo.mockClear();

		await act( async () =>
			listeners.get( 'preview-event' )?.( {
				payload: { type: 'ready' },
			} )
		);
		expect( emitted() ).toContainEqual( {
			type: 'slides',
			slides: { html: MARP.content, css: '' },
		} );
		expect( emitted() ).toContainEqual( {
			type: 'selected-line',
			line: 4,
		} );
	} );

	it( 'tells the window when the document is not a deck', async () => {
		await render( PLAIN, { placement: 'window' } );
		expect( emitted() ).toContainEqual( {
			type: 'slides',
			slides: { notice: 'Not a Marp document' },
		} );
	} );

	it( 'turns the preview off when the user closes the window', async () => {
		await render( MARP, { placement: 'window' } );
		await act( async () =>
			listeners.get( 'preview-window-closed' )?.( {} )
		);
		expect( isPreviewShown() ).toBe( false );
	} );

	it( 'keeps the preview on when the window closes as it moves', async () => {
		await render( MARP, { placement: 'panel' } );
		await act( async () =>
			listeners.get( 'preview-window-closed' )?.( {} )
		);
		expect( isPreviewShown() ).toBe( true );
	} );
} );
