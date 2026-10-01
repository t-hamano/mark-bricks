/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import {
	clampSlideIndex,
	createWheelTracker,
	getSlideIndexForKey,
} from './navigation';

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

describe( 'createWheelTracker', () => {
	it( 'moves to the next slide when scrolling down', () => {
		const track = createWheelTracker();
		expect( track( 100, 0 ) ).toBe( 1 );
	} );

	it( 'moves to the previous slide when scrolling up', () => {
		const track = createWheelTracker();
		expect( track( -100, 0 ) ).toBe( -1 );
	} );

	it( 'waits until a gesture scrolls far enough', () => {
		const track = createWheelTracker();
		expect( track( 8, 0 ) ).toBe( 0 );
		expect( track( 8, 16 ) ).toBe( 0 );
		expect( track( 8, 32 ) ).toBe( 1 );
	} );

	it( 'keeps moving while a gesture scrolls further', () => {
		const track = createWheelTracker();
		expect( track( 30, 0 ) ).toBe( 1 );
		expect( track( 50, 16 ) ).toBe( 0 );
		expect( track( 50, 32 ) ).toBe( 1 );
		expect( track( 50, 48 ) ).toBe( 0 );
		expect( track( 50, 64 ) ).toBe( 1 );
	} );

	it( 'moves back when a gesture turns around', () => {
		const track = createWheelTracker();
		expect( track( 30, 0 ) ).toBe( 1 );
		expect( track( -100, 16 ) ).toBe( -1 );
	} );

	it( 'moves again as soon as a new gesture starts', () => {
		const track = createWheelTracker();
		expect( track( 30, 0 ) ).toBe( 1 );
		expect( track( 30, 40 ) ).toBe( 0 );
		expect( track( 30, 200 ) ).toBe( 1 );
	} );

	it( 'forgets the distance of a gesture after a pause', () => {
		const track = createWheelTracker();
		expect( track( 15, 0 ) ).toBe( 0 );
		expect( track( 15, 200 ) ).toBe( 0 );
	} );
} );
