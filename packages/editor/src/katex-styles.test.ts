/**
 * External dependencies
 */
import { describe, it, expect } from 'vitest';
import katexCss from 'katex/dist/katex.min.css?raw';

/**
 * Internal dependencies
 */
import { rewriteFontSources } from './katex-styles';

describe( 'rewriteFontSources', () => {
	it( 'points every KaTeX font at its WOFF2 file only', () => {
		const sources = rewriteFontSources( katexCss ).match( /src:[^;}]*/g );
		expect( sources?.length ).toBeGreaterThan( 0 );
		sources?.forEach( ( source ) => {
			// A font missing from `KATEX_FONT_URLS` keeps its relative
			// `fonts/` URLs, which do not resolve in the apps.
			expect( source ).not.toContain( 'url(fonts/' );
			expect( source ).toMatch(
				/^src:url\([^)]+\.woff2[^)]*\) format\("woff2"\)$/
			);
		} );
	} );
} );
