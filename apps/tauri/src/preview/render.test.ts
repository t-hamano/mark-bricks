/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';
import * as fixtures from '@mark-bricks/fixtures';

/**
 * Internal dependencies
 */
import { renderSlides } from './render';

describe( 'renderSlides', () => {
	it( 'renders each slide of a deck', () => {
		const { html } = renderSlides( fixtures.marp );
		// One SVG per slide. A slide with background images holds extra
		// sections for them.
		expect( html.match( /<svg data-marpit-svg/g ) ).toHaveLength( 4 );
	} );

	it( 'leaves out the web fonts a theme imports', () => {
		const { css } = renderSlides( '---\nmarp: true\ntheme: gaia\n---\n' );
		expect( css ).toContain( 'Lato' );
		expect( css ).not.toContain( 'fonts.bunny.net' );
	} );

	it( 'points KaTeX at the bundled fonts', () => {
		const { css } = renderSlides(
			'---\nmarp: true\nmath: katex\n---\n\n$$\nx^2\n$$\n'
		);
		expect( css ).toContain( 'KaTeX_Main' );
		expect( css ).not.toMatch( /url\(['"]?fonts\// );
		expect( css ).not.toContain( 'cdn.jsdelivr.net' );
	} );
} );
