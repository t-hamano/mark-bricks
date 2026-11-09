/**
 * External dependencies
 */
import { describe, it, expect } from 'vitest';

/**
 * Internal dependencies
 */
import { blocksToMarkdown, markdownToBlocks } from '../converter';
import { getPlaceholderKeys } from './placeholders';
import {
	SLIDE_PATTERN_CATEGORIES,
	SLIDE_PATTERNS,
	getSlidePatternMarkdown,
} from '.';

// The converter pads table cells to line up their columns, by the length of
// the text that fills them in each locale. This leaves the padding out, so
// the patterns can write their tables compactly.
function collapseTablePadding( markdown: string ): string {
	return markdown.replace( /^\|.*\|$/gm, ( row ) =>
		row.replace( / {2,}/g, ' ' ).replace( /-{2,}/g, '-' )
	);
}

const patterns = SLIDE_PATTERNS.map(
	( pattern ) => [ pattern.name, pattern ] as const
);

describe( 'slide patterns', () => {
	it( 'have unique kebab-case names', () => {
		const names = SLIDE_PATTERNS.map( ( { name } ) => name );
		expect( new Set( names ).size ).toBe( names.length );
		for ( const name of names ) {
			expect( name ).toMatch( /^[a-z0-9]+(-[a-z0-9]+)*$/ );
		}
	} );

	it( 'belong to known categories, and are listed by category', () => {
		const order = SLIDE_PATTERN_CATEGORIES.map( ( { name } ) => name );
		expect( new Set( order ).size ).toBe( order.length );
		const firsts = SLIDE_PATTERNS.map( ( { categories } ) => {
			expect( categories.length ).toBeGreaterThan( 0 );
			expect( new Set( categories ).size ).toBe( categories.length );
			for ( const category of categories ) {
				expect( order ).toContain( category );
			}
			return order.indexOf( categories[ 0 ] );
		} );
		expect( firsts ).toEqual( [ ...firsts ].sort( ( a, b ) => a - b ) );
	} );

	it( 'fill every category', () => {
		for ( const { name, label } of SLIDE_PATTERN_CATEGORIES ) {
			expect( label() ).not.toBe( '' );
			expect(
				SLIDE_PATTERNS.some( ( { categories } ) =>
					categories.includes( name )
				)
			).toBe( true );
		}
	} );

	it.each( patterns )(
		'%s has a text for each placeholder, and no other',
		( _name, pattern ) => {
			expect( getPlaceholderKeys( pattern.markdown ).sort() ).toEqual(
				Object.keys( pattern.strings() ).sort()
			);
		}
	);

	it.each( patterns )(
		'%s has a title and plain text',
		( _name, pattern ) => {
			expect( pattern.title() ).not.toBe( '' );
			for ( const text of Object.values( pattern.strings() ) ) {
				expect( text ).not.toBe( '' );
				expect( text ).not.toMatch( /[\r\n]/ );
			}
		}
	);

	it.each( patterns )( '%s uses no style of its own', ( _name, pattern ) => {
		// The previews share one stylesheet per theme, which a pattern's
		// own `style` or `<style>` would change.
		expect( pattern.markdown ).not.toMatch( /<style[\s>]|_?style:/ );
	} );

	it.each( patterns )(
		'%s round-trips through the converter without loss',
		( _name, pattern ) => {
			const markdown = getSlidePatternMarkdown( pattern );
			expect( markdown ).not.toMatch( /\{\{/ );
			// The converter ends the document with a line break.
			expect(
				collapseTablePadding(
					blocksToMarkdown( markdownToBlocks( markdown ) )
				)
			).toBe( `${ markdown }\n` );
		}
	);
} );
