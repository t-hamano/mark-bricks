/**
 * External dependencies
 */
import { describe, it, expect } from 'vitest';
import { SLIDE_PATTERNS } from '@mark-bricks/editor/marp-patterns';

/**
 * Internal dependencies
 */
import { SLIDE_PATTERN_THEMES, renderSlidePatternPreviews } from '.';

// The editor bundles the previews from this file. Run
// `pnpm --filter @mark-bricks/marp-preview slide-patterns:update` after
// changing a pattern, or Marp, to write it again.
const PREVIEWS_PATH =
	'../../../editor/src/marp-patterns/previews.generated.json';

describe( 'renderSlidePatternPreviews', () => {
	it( 'renders every pattern in every theme', () => {
		const { css, html } = renderSlidePatternPreviews( SLIDE_PATTERNS );
		expect( Object.keys( css ) ).toEqual( [ ...SLIDE_PATTERN_THEMES ] );
		expect( Object.keys( html ) ).toEqual(
			SLIDE_PATTERNS.map( ( { name } ) => name )
		);
		for ( const pattern of SLIDE_PATTERNS ) {
			for ( const theme of SLIDE_PATTERN_THEMES ) {
				expect( html[ pattern.name ][ theme ] ).toContain(
					`data-theme="${ theme }"`
				);
			}
		}
	} );

	it( 'keeps the placeholders of the text', () => {
		const { html } = renderSlidePatternPreviews( SLIDE_PATTERNS );
		for ( const pattern of SLIDE_PATTERNS ) {
			for ( const key of Object.keys( pattern.strings() ) ) {
				expect( html[ pattern.name ].default ).toContain(
					`{{${ key }}}`
				);
			}
		}
	} );

	it( 'loads no web fonts', () => {
		const { css } = renderSlidePatternPreviews( SLIDE_PATTERNS );
		for ( const theme of SLIDE_PATTERN_THEMES ) {
			expect( css[ theme ] ).not.toMatch( /@import/ );
		}
	} );

	it( 'rejects a pattern that adds its own style', () => {
		expect( () =>
			renderSlidePatternPreviews( [
				{
					name: 'styled',
					title: () => 'Styled',
					markdown: '<style>h1 { color: red; }</style>\n\n# Title',
					strings: () => ( {} ),
				},
			] )
		).toThrow( /"styled" pattern changes the stylesheet/ );
	} );

	it( 'matches the previews the editor bundles', async () => {
		const previews = renderSlidePatternPreviews( SLIDE_PATTERNS );
		await expect(
			`${ JSON.stringify( previews, null, '\t' ) }\n`
		).toMatchFileSnapshot( PREVIEWS_PATH );
	} );
} );
