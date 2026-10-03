// @vitest-environment jsdom

/**
 * External dependencies
 */
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Internal dependencies
 */
import { renderHtmlDocument } from '..';
import { setupExportedDeck } from './deck';

// Used when leaving the slide mode, but missing from jsdom.
Element.prototype.scrollIntoView = vi.fn();

const DECK = '---\nmarp: true\n---\n\nA\n\n---\n\nB\n\n---\n\nC\n';

// Fills the page with an exported deck's slides, without running its
// scripts, and sets up the navigation, which renders its toolbar right away.
function setup() {
	const page = new DOMParser().parseFromString(
		renderHtmlDocument( DECK ),
		'text/html'
	);
	document.body.innerHTML = page.body.innerHTML;
	act( () => setupExportedDeck() );
}

function press( key: string ) {
	act( () => {
		window.dispatchEvent(
			new KeyboardEvent( 'keydown', { key, cancelable: true } )
		);
	} );
}

function getButton( name: string ) {
	return Array.from( document.querySelectorAll( 'button' ) ).find(
		( button ) =>
			button.textContent === name ||
			button.getAttribute( 'aria-label' ) === name
	);
}

function getCurrentSlide() {
	return Array.from( document.querySelectorAll( 'body > svg' ) ).findIndex(
		( slide ) => slide.classList.contains( 'is-current' )
	);
}

function isSlideModeShown() {
	return document.documentElement.classList.contains( 'is-slide-mode' );
}

// The listeners each test's page adds to the window, removed after it so
// that the next test's keys reach only its own page.
const listeners: Array< [ string, EventListenerOrEventListenerObject ] > = [];
const addEventListener = window.addEventListener.bind( window );

describe( 'setupExportedDeck', () => {
	beforeEach( () => {
		vi.spyOn( window, 'addEventListener' ).mockImplementation(
			( type, listener, options ) => {
				listeners.push( [ type, listener ] );
				addEventListener( type, listener, options );
			}
		);
		document.documentElement.className = '';
		Object.assign( globalThis, { IS_REACT_ACT_ENVIRONMENT: true } );
	} );

	afterEach( () => {
		vi.mocked( window.addEventListener ).mockRestore();
		for ( const [ type, listener ] of listeners.splice( 0 ) ) {
			window.removeEventListener( type, listener );
		}
	} );

	it( 'names the slides by their number', () => {
		setup();
		const labels = Array.from(
			document.querySelectorAll( 'body > svg' ),
			( slide ) => slide.getAttribute( 'aria-label' )
		);
		expect( labels ).toEqual( [
			'Slide 1 of 3',
			'Slide 2 of 3',
			'Slide 3 of 3',
		] );
	} );

	it( 'toggles the slide mode with F and leaves it with Escape', () => {
		setup();

		press( 'f' );
		expect( isSlideModeShown() ).toBe( true );
		expect( getButton( 'Exit slide mode' ) ).toBeDefined();

		press( 'Escape' );
		expect( isSlideModeShown() ).toBe( false );
		expect( getButton( 'Enter slide mode' ) ).toBeDefined();
	} );

	it( 'toggles the slide mode with the toolbar button', () => {
		setup();

		act( () => getButton( 'Enter slide mode' )?.click() );
		expect( isSlideModeShown() ).toBe( true );
	} );

	it( 'moves between the slides with the keys and the pager', () => {
		setup();
		press( 'f' );

		press( 'ArrowRight' );
		expect( getCurrentSlide() ).toBe( 1 );

		act( () => getButton( 'Next slide' )?.click() );
		expect( getCurrentSlide() ).toBe( 2 );
		expect( getButton( 'Next slide' )?.disabled ).toBe( true );

		const select = document.querySelector( 'select' ) as HTMLSelectElement;
		expect( select.value ).toBe( '2' );
		act( () => {
			select.value = '0';
			select.dispatchEvent( new Event( 'change', { bubbles: true } ) );
		} );
		expect( getCurrentSlide() ).toBe( 0 );
	} );

	it( 'leaves the slide mode when full screen ends', () => {
		setup();
		press( 'f' );

		act( () => {
			document.dispatchEvent( new Event( 'fullscreenchange' ) );
		} );
		expect( isSlideModeShown() ).toBe( false );
	} );
} );
