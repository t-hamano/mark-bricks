/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';
import * as fixtures from '@mark-bricks/fixtures';

/**
 * Internal dependencies
 */
import { runtimeScript, runtimeStyle } from '../../dist/runtime';
import { createExportMarp, getDeckInfo, renderHtmlDocument } from '.';

const deck = ( frontMatter: string, body = '# Slide\n' ) =>
	`---\nmarp: true\n${ frontMatter }\n---\n\n${ body }`;

describe( 'renderHtmlDocument', () => {
	it( 'fills the head from the global directives', () => {
		const html = renderHtmlDocument(
			deck(
				[
					'title: Deck',
					'description: About the deck',
					'author: Jane',
					'keywords: a, b, a',
					'url: https://example.com/deck',
					'image: https://example.com/og.png',
					'lang: ja',
				].join( '\n' )
			)
		);
		expect( html ).toMatch( /^<!DOCTYPE html><html lang="ja"><head>/ );
		expect( html ).toContain( '<title>Deck</title>' );
		expect( html ).toContain( '<meta property="og:title" content="Deck">' );
		expect( html ).toContain(
			'<meta name="description" content="About the deck">'
		);
		expect( html ).toContain( '<meta name="author" content="Jane">' );
		expect( html ).toContain( '<meta name="keywords" content="a,b">' );
		expect( html ).toContain(
			'<link rel="canonical" href="https://example.com/deck">'
		);
		expect( html ).toContain(
			'<meta property="og:image" content="https://example.com/og.png">'
		);
		expect( html ).toContain(
			'<meta name="twitter:card" content="summary_large_image">'
		);
	} );

	it( 'leaves out the metadata a deck does not set', () => {
		const html = renderHtmlDocument( '---\nmarp: true\n---\n\nText\n' );
		expect( html ).toMatch( /^<!DOCTYPE html><html><head>/ );
		expect( html ).not.toContain( '<title>' );
		expect( html ).not.toContain( 'name="description"' );
		expect( html ).toContain(
			'<meta name="twitter:card" content="summary">'
		);
	} );

	it( 'ignores an invalid URL', () => {
		const html = renderHtmlDocument( deck( 'url: not a url' ) );
		expect( html ).not.toContain( 'canonical' );
	} );

	it( 'escapes the metadata', () => {
		const html = renderHtmlDocument(
			deck( `title: "</title><script>x</script>"\nauthor: '"a" & b'` )
		);
		expect( html ).toContain(
			'<title>&#60;/title&#62;&#60;script&#62;x&#60;/script&#62;</title>'
		);
		expect( html ).toContain(
			'<meta name="author" content="&#34;a&#34; &#38; b">'
		);
	} );

	it( "falls back to the top-level heading's text for the title", () => {
		const html = renderHtmlDocument(
			'---\nmarp: true\n---\n\n## Second\n\n---\n\n# **First**\n'
		);
		expect( html ).toContain( '<title>**First**</title>' );
	} );

	it( "includes Marp's inline browser script", () => {
		const html = renderHtmlDocument( fixtures.marp );
		expect( html ).toContain( '<script>' );
	} );

	it( "adds the toolbar's script and stylesheet", () => {
		const html = renderHtmlDocument( fixtures.marp );
		expect( html ).toContain( `<style>${ runtimeStyle }</style>` );
		expect( html ).toContain(
			`<script>${ runtimeScript }</script></body>`
		);
		// The script does not close its element early.
		expect( runtimeScript ).not.toMatch( /<\/script/i );
	} );

	it( 'renders the slides straight into the body', () => {
		const html = renderHtmlDocument( fixtures.marp );
		expect( html ).toContain( '<body><svg data-marpit-svg' );
	} );

	it( 'keeps image sources as written', () => {
		const html = renderHtmlDocument(
			deck( '', '![](./a.png)\n\n![bg](../b.png)\n' )
		);
		expect( html ).toContain( 'src="./a.png"' );
		expect( html ).toContain( '../b.png' );
	} );

	it( 'keeps the web fonts a theme imports', () => {
		const html = renderHtmlDocument( fixtures.marp );
		expect( html ).toContain( 'fonts.bunny.net' );
	} );

	it( "loads KaTeX's fonts from a CDN", () => {
		const html = renderHtmlDocument(
			deck( 'math: katex', '$$\nx^2\n$$\n' )
		);
		expect( html ).toContain( 'cdn.jsdelivr.net' );
	} );
} );

describe( 'getDeckInfo', () => {
	it( 'reads the metadata', () => {
		expect(
			getDeckInfo(
				deck( 'title: Deck\nauthor: Jane\nkeywords: [a, b]\nlang: en' )
			)
		).toMatchObject( {
			title: 'Deck',
			author: 'Jane',
			keywords: [ 'a', 'b' ],
			lang: 'en',
		} );
	} );

	it.each( [
		[ '16:9', 1280, 720 ],
		[ '4:3', 960, 720 ],
	] )( 'reads the slide size of a %s deck', ( size, width, height ) => {
		expect( getDeckInfo( deck( `size: ${ size }` ) ) ).toMatchObject( {
			width,
			height,
		} );
	} );

	it( "reads the slide size of a theme's size preset", () => {
		expect( getDeckInfo( deck( 'theme: gaia\nsize: 4:3' ) ) ).toMatchObject(
			{ width: 960, height: 720 }
		);
	} );
} );

describe( 'createExportMarp', () => {
	it( 'keeps the constructor options it is given', () => {
		const marp = createExportMarp( { container: [], lang: 'fr' } );
		const { html } = marp.render( '# Slide\n' );
		expect( html ).toMatch( /^<svg/ );
		expect( html ).toContain( 'lang="fr"' );
	} );
} );
