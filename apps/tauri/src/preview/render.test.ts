/**
 * External dependencies
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearMocks, mockConvertFileSrc } from '@tauri-apps/api/mocks';

/**
 * Internal dependencies
 */
import { renderSlides } from './render';

describe( 'renderSlides', () => {
	beforeEach( () => {
		mockConvertFileSrc( 'macos' );
	} );

	afterEach( () => {
		clearMocks();
	} );

	it( 'loads relative images from the deck folder', () => {
		const { html } = renderSlides(
			'---\nmarp: true\n---\n\n![](./a.png)\n\n![bg](../b.png)\n',
			'/docs/deck/slides.md'
		);
		expect( html ).toContain(
			'src="asset://localhost/%2Fdocs%2Fdeck%2Fa.png"'
		);
		// Marp renders a background image as a CSS `url()`.
		expect( html ).toContain( 'asset://localhost/%2Fdocs%2Fb.png' );
		expect( html ).not.toContain( './a.png' );
		expect( html ).not.toContain( '../b.png' );
	} );

	it( 'leaves web images as they are', () => {
		const { html } = renderSlides(
			'---\nmarp: true\n---\n\n![bg](https://example.com/a.png)\n',
			'/docs/slides.md'
		);
		expect( html ).toContain( 'https://example.com/a.png' );
		expect( html ).not.toContain( 'asset://' );
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
