// @vitest-environment jsdom

/**
 * External dependencies
 */
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Internal dependencies
 */
import { renderSlides } from '..';
import { createSlidePreview } from './preview';

// Used by Marp's auto-scaling elements, but missing from jsdom.
vi.stubGlobal(
	'ResizeObserver',
	class {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
);
// Keeps jsdom from logging that it has no canvas, which Marp's browser
// script probes for.
vi.spyOn( HTMLCanvasElement.prototype, 'getContext' ).mockReturnValue( null );

const DECK = '---\nmarp: true\n---\n\nA\n\n---\n\nB\n';

const labels = {
	enterSlideMode: 'Enter slide mode',
	exitSlideMode: 'Exit slide mode',
	exitSlideModeHint: 'Press F or Escape to exit',
	previousSlide: 'Previous slide',
	nextSlide: 'Next slide',
	slideNumber: 'Slide number',
};

function nextFrame() {
	return new Promise( ( resolve ) => requestAnimationFrame( resolve ) );
}

function press( key: string, init: KeyboardEventInit = {} ) {
	act( () => {
		window.dispatchEvent(
			new KeyboardEvent( 'keydown', { key, cancelable: true, ...init } )
		);
	} );
}

function isSlideModeShown() {
	return document.documentElement.classList.contains( 'is-slide-mode' );
}

// The listeners each test's preview adds to the window, removed after it so
// that the next test's keys reach only its own preview.
const listeners: Array< [ string, EventListenerOrEventListenerObject ] > = [];
const addEventListener = window.addEventListener.bind( window );

describe( 'createSlidePreview', () => {
	beforeEach( () => {
		vi.spyOn( window, 'addEventListener' ).mockImplementation(
			( type, listener, options ) => {
				listeners.push( [ type, listener ] );
				addEventListener( type, listener, options );
			}
		);
		document.head.innerHTML = '';
		document.body.innerHTML = '';
		document.documentElement.className = '';
		Object.assign( globalThis, { IS_REACT_ACT_ENVIRONMENT: true } );
	} );

	afterEach( () => {
		vi.mocked( window.addEventListener ).mockRestore();
		for ( const [ type, listener ] of listeners.splice( 0 ) ) {
			window.removeEventListener( type, listener );
		}
	} );

	it( 'reports the number of slides after each render', async () => {
		const onRender = vi.fn();
		const preview = createSlidePreview( document.body, { onRender } );

		preview.render( renderSlides( DECK ) );
		await nextFrame();
		expect( onRender ).toHaveBeenLastCalledWith( 2 );

		preview.render( { notice: 'Not a Marp document' } );
		await nextFrame();
		expect( onRender ).toHaveBeenLastCalledWith( 0 );
	} );

	it( 'toggles the slide mode with F and leaves it with Escape', () => {
		const preview = createSlidePreview( document.body );

		press( 'f' );
		expect( preview.isSlideMode() ).toBe( true );
		expect( isSlideModeShown() ).toBe( true );
		press( 'F' );
		expect( preview.isSlideMode() ).toBe( false );

		press( 'f' );
		press( 'Escape' );
		expect( preview.isSlideMode() ).toBe( false );
		expect( isSlideModeShown() ).toBe( false );
	} );

	it( 'toggles the slide mode with the toolbar button', () => {
		const preview = createSlidePreview( document.body );
		act( () => preview.setLabels( labels ) );

		const button = Array.from( document.querySelectorAll( 'button' ) ).find(
			( element ) => element.textContent === 'Enter slide mode'
		);
		act( () => button?.click() );

		expect( preview.isSlideMode() ).toBe( true );
		expect( button?.textContent ).toBe( 'Exit slide mode' );
	} );

	it( 'toggles the slide mode with the given keys only', () => {
		const preview = createSlidePreview( document.body, {
			toggleKeys: [ 'f', 'F11' ],
		} );

		press( 'F11' );
		expect( preview.isSlideMode() ).toBe( true );

		const other = createSlidePreview( document.body );
		press( 'F11' );
		expect( other.isSlideMode() ).toBe( false );
	} );

	it( 'ignores the keys with modifiers or while held', () => {
		const preview = createSlidePreview( document.body );

		press( 'f', { ctrlKey: true } );
		press( 'f', { metaKey: true } );
		press( 'f', { altKey: true } );
		press( 'f', { repeat: true } );

		expect( preview.isSlideMode() ).toBe( false );
	} );

	it( 'leaves the slide mode to the host when it handles the requests', () => {
		const onSlideModeRequest = vi.fn();
		const preview = createSlidePreview( document.body, {
			onSlideModeRequest,
		} );

		press( 'f' );
		expect( onSlideModeRequest ).toHaveBeenLastCalledWith( true );
		expect( preview.isSlideMode() ).toBe( false );

		act( () => preview.setSlideMode( true ) );
		press( 'Escape' );
		expect( onSlideModeRequest ).toHaveBeenLastCalledWith( false );
		expect( preview.isSlideMode() ).toBe( true );
	} );
} );
