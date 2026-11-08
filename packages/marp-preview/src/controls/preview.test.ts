// @vitest-environment jsdom

/**
 * External dependencies
 */
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * WordPress dependencies
 */
import { resetLocaleData } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { renderSlides } from '../render';
import {
	createSlidePreview,
	type SlidePreview,
	type SlidePreviewOptions,
} from './preview';

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

// A list item at line 6, and `B` at line 10, on the second slide.
const SOURCE_DECK = '---\nmarp: true\n---\n\n# A\n\n- x\n\n---\n\nB\n';

// Sets up a preview page, which renders its toolbar right away.
function setup( options?: SlidePreviewOptions ) {
	let preview: SlidePreview | undefined;
	act( () => {
		preview = createSlidePreview( document.body, options );
	} );
	return preview as SlidePreview;
}

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
		resetLocaleData();
	} );

	it( 'reports the number of slides after each render', async () => {
		const onRender = vi.fn();
		const preview = setup( { onRender } );

		preview.render( renderSlides( DECK ) );
		await nextFrame();
		expect( onRender ).toHaveBeenLastCalledWith( 2 );

		preview.render( { notice: 'Not a Marp document' } );
		await nextFrame();
		expect( onRender ).toHaveBeenLastCalledWith( 0 );
	} );

	it( 'names the slides and puts only the current one in the focus order', async () => {
		const preview = setup();
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

	it( 'names the slides in the locale passed', async () => {
		const preview = setup( { locale: 'ja' } );
		preview.render( renderSlides( DECK ) );
		await nextFrame();

		const slides = document.querySelectorAll( '.marpit > svg' );
		expect( slides[ 0 ].getAttribute( 'aria-label' ) ).toBe(
			'スライド 1 / 2'
		);
	} );

	it( 'moves the focus along with the slide shown in the slide mode', async () => {
		const preview = setup();
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
		const preview = setup();

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
		const preview = setup();

		const button = Array.from( document.querySelectorAll( 'button' ) ).find(
			( element ) => element.textContent === 'Enter slide mode'
		);
		act( () => button?.click() );

		expect( preview.isSlideMode() ).toBe( true );
		expect( button?.textContent ).toBe( 'Exit slide mode' );
	} );

	it( 'moves the focus to the current slide with the toolbar button', async () => {
		const preview = setup();
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
		const preview = setup( {
			toggleKeys: [ 'f', 'F11' ],
		} );

		press( 'F11' );
		expect( preview.isSlideMode() ).toBe( true );

		const other = setup();
		press( 'F11' );
		expect( other.isSlideMode() ).toBe( false );
	} );

	it( 'only leaves the slide mode with Escape, even as a toggle key', () => {
		const preview = setup( {
			toggleKeys: [ 'f', 'Escape' ],
		} );

		press( 'Escape' );
		expect( preview.isSlideMode() ).toBe( false );

		press( 'f' );
		press( 'Escape' );
		expect( preview.isSlideMode() ).toBe( false );
	} );

	it( 'ignores the keys with modifiers or while held', () => {
		const preview = setup();

		press( 'f', { ctrlKey: true } );
		press( 'f', { metaKey: true } );
		press( 'f', { altKey: true } );
		press( 'f', { repeat: true } );

		expect( preview.isSlideMode() ).toBe( false );
	} );

	it( 'leaves the slide mode to the host when it handles the requests', () => {
		const onSlideModeRequest = vi.fn();
		const preview = setup( {
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
	it( 'reports the line of the element clicked, or of the slide outside its elements', async () => {
		const onSourceLineClick = vi.fn();
		const preview = setup( { onSourceLineClick } );
		preview.render( renderSlides( SOURCE_DECK ) );
		await nextFrame();

		act( () => document.querySelector( 'li' )?.click() );
		expect( onSourceLineClick ).toHaveBeenLastCalledWith( 6 );
		act( () => document.querySelectorAll( 'section' )[ 1 ]?.click() );
		expect( onSourceLineClick ).toHaveBeenLastCalledWith( 10 );
	} );

	it( 'does not report clicks in the slide mode', async () => {
		const onSourceLineClick = vi.fn();
		const preview = setup( { onSourceLineClick } );
		preview.render( renderSlides( SOURCE_DECK ) );
		await nextFrame();
		press( 'f' );

		act( () => document.querySelector( 'li' )?.click() );
		expect( onSourceLineClick ).not.toHaveBeenCalled();
	} );

	it( 'highlights the element of a line, and keeps it after a render', async () => {
		const preview = setup();
		preview.render( renderSlides( SOURCE_DECK ) );
		await nextFrame();

		preview.revealSourceLine( 10 );
		const highlighted = () =>
			Array.from(
				document.querySelectorAll( '.is-source-highlighted' ),
				( element ) => element.textContent
			);
		expect( highlighted() ).toEqual( [ 'B' ] );

		preview.render( renderSlides( SOURCE_DECK ) );
		await nextFrame();
		expect( highlighted() ).toEqual( [ 'B' ] );

		preview.revealSourceLine( null );
		expect( highlighted() ).toEqual( [] );
	} );

	it( 'moves to the slide of a line out of view', async () => {
		const preview = setup();
		preview.render( renderSlides( SOURCE_DECK ) );
		await nextFrame();

		const slides =
			document.querySelectorAll< SVGSVGElement >( '.marpit > svg' );
		vi.spyOn( slides[ 1 ], 'getBoundingClientRect' ).mockReturnValue(
			new DOMRect( 0, window.innerHeight, 100, 100 )
		);
		const scrollIntoView = vi.spyOn( slides[ 1 ], 'scrollIntoView' );
		preview.revealSourceLine( 10 );
		expect( scrollIntoView ).toHaveBeenCalled();
	} );

	it( 'stays on the current slide in the slide mode', async () => {
		const preview = setup();
		preview.render( renderSlides( SOURCE_DECK ) );
		await nextFrame();
		press( 'f' );

		preview.revealSourceLine( 10 );
		const slides = document.querySelectorAll( '.marpit > svg' );
		expect( slides[ 0 ].classList.contains( 'is-current' ) ).toBe( true );
	} );

	it( 'reports the first line of the clicked slide at the slide level', async () => {
		const onSourceLineClick = vi.fn();
		const preview = setup( {
			onSourceLineClick,
			sourceSyncLevel: 'slide',
		} );
		preview.render( renderSlides( SOURCE_DECK ) );
		await nextFrame();

		act( () => document.querySelector( 'li' )?.click() );
		expect( onSourceLineClick ).toHaveBeenLastCalledWith( 4 );
		act( () => document.querySelectorAll( 'section' )[ 1 ]?.click() );
		expect( onSourceLineClick ).toHaveBeenLastCalledWith( 10 );
	} );

	it( 'moves to the slide of a line without highlighting at the slide level', async () => {
		const preview = setup( { sourceSyncLevel: 'slide' } );
		preview.render( renderSlides( SOURCE_DECK ) );
		await nextFrame();

		const slides =
			document.querySelectorAll< SVGSVGElement >( '.marpit > svg' );
		vi.spyOn( slides[ 1 ], 'getBoundingClientRect' ).mockReturnValue(
			new DOMRect( 0, window.innerHeight, 100, 100 )
		);
		const scrollIntoView = vi.spyOn( slides[ 1 ], 'scrollIntoView' );
		preview.revealSourceLine( 10 );
		expect( scrollIntoView ).toHaveBeenCalled();
		expect( document.querySelector( '.is-source-highlighted' ) ).toBeNull();
	} );
} );
