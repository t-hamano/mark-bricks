/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import { clampSlideIndex, getSlideIndexForKey } from './navigation';

describe( 'clampSlideIndex', () => {
	it( 'keeps an index within the deck', () => {
		expect( clampSlideIndex( 2, 5 ) ).toBe( 2 );
	} );

	it( 'moves to the last slide when slides are removed', () => {
		expect( clampSlideIndex( 4, 2 ) ).toBe( 1 );
	} );

	it( 'moves to the first slide from a negative index', () => {
		expect( clampSlideIndex( -1, 3 ) ).toBe( 0 );
	} );

	it( 'returns 0 for an empty deck', () => {
		expect( clampSlideIndex( 3, 0 ) ).toBe( 0 );
	} );
} );

describe( 'getSlideIndexForKey', () => {
	it.each( [ 'ArrowRight', 'ArrowDown', 'PageDown' ] )(
		'moves to the next slide with %s',
		( key ) => {
			expect( getSlideIndexForKey( key, 1, 5 ) ).toBe( 2 );
		}
	);

	it.each( [ 'ArrowLeft', 'ArrowUp', 'PageUp' ] )(
		'moves to the previous slide with %s',
		( key ) => {
			expect( getSlideIndexForKey( key, 1, 5 ) ).toBe( 0 );
		}
	);

	it( 'stays on the last slide', () => {
		expect( getSlideIndexForKey( 'ArrowRight', 4, 5 ) ).toBe( 4 );
	} );

	it( 'stays on the first slide', () => {
		expect( getSlideIndexForKey( 'ArrowLeft', 0, 5 ) ).toBe( 0 );
	} );

	it( 'moves to the first slide with Home', () => {
		expect( getSlideIndexForKey( 'Home', 3, 5 ) ).toBe( 0 );
	} );

	it( 'moves to the last slide with End', () => {
		expect( getSlideIndexForKey( 'End', 1, 5 ) ).toBe( 4 );
	} );

	it( 'brings an out-of-range index back into the deck', () => {
		expect( getSlideIndexForKey( 'ArrowRight', 7, 3 ) ).toBe( 2 );
	} );

	it( 'stays on slide 0 in an empty deck', () => {
		expect( getSlideIndexForKey( 'End', 0, 0 ) ).toBe( 0 );
		expect( getSlideIndexForKey( 'ArrowRight', 0, 0 ) ).toBe( 0 );
	} );

	it.each( [ ' ', 'Enter', 'f', 'Escape' ] )( 'ignores %j', ( key ) => {
		expect( getSlideIndexForKey( key, 1, 5 ) ).toBeNull();
	} );
} );
