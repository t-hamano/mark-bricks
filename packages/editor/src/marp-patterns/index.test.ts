/**
 * External dependencies
 */
import { describe, it, expect } from 'vitest';

/**
 * Internal dependencies
 */
import { blocksToMarkdown, markdownToBlocks } from '../converter';
import { getPlaceholderKeys } from './placeholders';
import { SLIDE_PATTERNS, getSlidePatternMarkdown } from '.';

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
			expect( blocksToMarkdown( markdownToBlocks( markdown ) ) ).toBe(
				`${ markdown }\n`
			);
		}
	);
} );
