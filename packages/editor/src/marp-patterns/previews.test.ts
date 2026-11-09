/**
 * External dependencies
 */
import { describe, it, expect } from 'vitest';

/**
 * Internal dependencies
 */
import { SLIDE_PATTERNS } from '.';
import {
	SLIDE_PATTERN_THEMES,
	getSlidePatternPreview,
	getSlidePatternTheme,
	loadSlidePatternPreviews,
	type SlidePatternPreviews,
} from './previews';
import type { SlidePattern } from './types';

describe( 'getSlidePatternTheme', () => {
	it.each( [
		[ null, 'default' ],
		[ 'gaia', 'gaia' ],
		[ ' Uncover ', 'uncover' ],
		[ 'my-theme', 'default' ],
	] )( 'shows %j in %s', ( theme, expected ) => {
		expect( getSlidePatternTheme( theme ) ).toBe( expected );
	} );
} );

describe( 'getSlidePatternPreview', () => {
	const pattern: SlidePattern = {
		name: 'test',
		title: () => 'Test',
		categories: [ 'text' ],
		markdown: '# {{heading}}',
		strings: () => ( { heading: 'Q&A <today>' } ),
	};
	const previews: SlidePatternPreviews = {
		css: { default: 'd', gaia: 'g', uncover: 'u' },
		html: {
			test: {
				default: '<h1>{{heading}}</h1>',
				gaia: '<h1 class="gaia">{{heading}}</h1>',
				uncover: '<h1 class="uncover">{{heading}}</h1>',
			},
		},
	};

	it( 'puts in the text, escaped', () => {
		expect( getSlidePatternPreview( previews, pattern, 'gaia' ) ).toEqual( {
			html: '<h1 class="gaia">Q&amp;A &lt;today></h1>',
			css: 'g',
		} );
	} );

	it( 'returns null for a pattern without previews', () => {
		expect(
			getSlidePatternPreview(
				previews,
				{ ...pattern, name: 'missing' },
				'default'
			)
		).toBeNull();
	} );
} );

describe( 'loadSlidePatternPreviews', () => {
	it( 'has every pattern in every theme, with all of its text', async () => {
		const previews = await loadSlidePatternPreviews();
		for ( const pattern of SLIDE_PATTERNS ) {
			for ( const theme of SLIDE_PATTERN_THEMES ) {
				const preview = getSlidePatternPreview(
					previews,
					pattern,
					theme
				);
				expect( preview?.html ).toBeTruthy();
				expect( preview?.html ).not.toMatch( /\{\{\w+\}\}/ );
			}
		}
	} );
} );
