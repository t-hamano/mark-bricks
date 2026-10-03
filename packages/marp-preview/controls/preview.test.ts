// @vitest-environment jsdom

/**
 * External dependencies
 */
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Internal dependencies
 */
import { renderSlides } from '../render';
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
// Used when leaving the slide mode, but missing from jsdom.
Element.prototype.scrollIntoView = vi.fn();
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

	it( 'names the slides and puts only the current one in the focus order', async () => {
		const preview = createSlidePreview( document.body );
		preview.render( renderSlides( DECK ) );
		await nextFrame();

		const slides = document.querySelectorAll( '.marpit > svg' );
		expect( slides[ 0 ].getAttribute( 'role' ) ).toBe( 'group' );
		expect( slides[ 0 ].getAttribute( 'aria-label' ) ).toBe(
			'Slide 1 of 2'
		);
		expect( slides[ 1 ].getAttribute( 'aria-label' ) ).toBe(
			'Slide 2 of 2'
		);
		expect( slides[ 0 ].getAttribute( 'tabindex' ) ).toBe( '0' );
		expect( slides[ 1 ].getAttribute( 'tabindex' ) ).toBe( '-1' );
	} );

	it( 'moves the focus along with the slide shown in the slide mode', async () => {
		const preview = createSlidePreview( document.body );
		preview.render( renderSlides( DECK ) );
		await nextFrame();
		press( 'f' );

		const slides =
			document.querySelectorAll< SVGSVGElement >( '.marpit > svg' );
		slides[ 0 ].focus();
		press( 'ArrowRight' );

		expect( slides[ 1 ].getAttribute( 'tabindex' ) ).toBe( '0' );
		expect( slides[ 1 ].ownerDocument.activeElement ).toBe( slides[ 1 ] );
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

	it( 'moves the focus to the current slide with the toolbar button', async () => {
		const preview = createSlidePreview( document.body );
		act( () => preview.setLabels( labels ) );
		preview.render( renderSlides( DECK ) );
		await nextFrame();

		const button = Array.from( document.querySelectorAll( 'button' ) ).find(
			( element ) => element.textContent === 'Enter slide mode'
		);
		const slide =
			document.querySelector< SVGSVGElement >( '.marpit > svg' );
		button?.focus();
		act( () => button?.click() );
		expect( slide?.ownerDocument.activeElement ).toBe( slide );

		button?.focus();
		act( () => button?.click() );
		expect( preview.isSlideMode() ).toBe( false );
		expect( slide?.ownerDocument.activeElement ).toBe( slide );
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

	it( 'only leaves the slide mode with Escape, even as a toggle key', () => {
		const preview = createSlidePreview( document.body, {
			toggleKeys: [ 'f', 'Escape' ],
		} );

		press( 'Escape' );
		expect( preview.isSlideMode() ).toBe( false );

		press( 'f' );
		press( 'Escape' );
		expect( preview.isSlideMode() ).toBe( false );
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
