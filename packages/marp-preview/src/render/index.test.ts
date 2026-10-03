/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';
import * as fixtures from '@mark-bricks/fixtures';

/**
 * Internal dependencies
 */
import { renderSlides } from '.';

describe( 'renderSlides', () => {
	it( 'points images at the URLs the host resolves them to', () => {
		const { html } = renderSlides(
			'---\nmarp: true\n---\n\n![](./a.png)\n\n![bg](../b.png)\n',
			{ resolveImageSrc: ( src ) => `resolved:${ src }` }
		);
		expect( html ).toContain( 'src="resolved:./a.png"' );
		// Marp renders a background image as a CSS `url()`.
		expect( html ).toContain( 'resolved:../b.png' );
	} );

	it( 'keeps images the host does not resolve', () => {
		const { html } = renderSlides(
			'---\nmarp: true\n---\n\n![bg](https://example.com/a.png)\n',
			{ resolveImageSrc: () => null }
		);
		expect( html ).toContain( 'https://example.com/a.png' );
	} );

	it( 'renders each slide of a deck', () => {
		const { html } = renderSlides( fixtures.marp );
		// One SVG per slide. A slide with background images holds extra
		// sections for them.
		expect( html.match( /<svg data-marpit-svg/g ) ).toHaveLength( 10 );
	} );

	it( 'leaves out the web fonts a theme imports', () => {
		const { css } = renderSlides( '---\nmarp: true\ntheme: gaia\n---\n' );
		expect( css ).toContain( 'Lato' );
		expect( css ).not.toContain( 'fonts.bunny.net' );
	} );

	it( 'keeps KaTeX font URLs relative', () => {
		const { css } = renderSlides(
			'---\nmarp: true\nmath: katex\n---\n\n$$\nx^2\n$$\n'
		);
		expect( css ).toMatch( /url\(['"]?fonts\/KaTeX_Main/ );
		expect( css ).not.toContain( 'cdn.jsdelivr.net' );
	} );
} );
