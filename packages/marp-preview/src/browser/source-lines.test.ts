// @vitest-environment jsdom

/**
 * External dependencies
 */
import { beforeEach, describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import { findSourceElement, getSourceLine } from './source-lines';

describe( 'source lines', () => {
	beforeEach( () => {
		document.body.innerHTML = `
			<section data-line="0">
				<h1 data-line="4">A</h1>
				<ul data-line="6"><li data-line="6"><em>x</em></li><li data-line="7">y</li></ul>
			</section>
			<p id="outside">z</p>
		`;
	} );

	it( 'reads the line of the innermost element with one', () => {
		expect( getSourceLine( document.querySelector( 'em' ) ) ).toBe( 6 );
		expect( getSourceLine( document.querySelector( 'section' ) ) ).toBe(
			0
		);
		expect(
			getSourceLine( document.getElementById( 'outside' ) )
		).toBeNull();
		expect( getSourceLine( null ) ).toBeNull();
	} );

	it( 'finds the outermost element that starts at a line', () => {
		expect( findSourceElement( document.body, 6 )?.tagName ).toBe( 'UL' );
		expect( findSourceElement( document.body, 7 )?.textContent ).toBe(
			'y'
		);
	} );

	it( 'falls back to the closest element before a line', () => {
		expect( findSourceElement( document.body, 5 )?.tagName ).toBe( 'H1' );
		expect( findSourceElement( document.body, 2 )?.tagName ).toBe(
			'SECTION'
		);
	} );

	it( 'finds nothing before the first element', () => {
		document.querySelector( 'section' )?.setAttribute( 'data-line', '3' );
		expect( findSourceElement( document.body, 1 ) ).toBeNull();
	} );
} );
