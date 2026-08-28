/**
 * External dependencies
 */
import { describe, it, expect } from 'vitest';

/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import { markdownToBlocks, blocksToMarkdown } from '..';

function paragraphBlock( content: string ): Block {
	return {
		name: 'core/paragraph',
		clientId: 'test-id',
		attributes: { content },
		innerBlocks: [],
		isValid: true,
	};
}

describe( 'inline markers', () => {
	describe( 'markdown-to-blocks', () => {
		it.each( [
			[
				'emphasis',
				'_emphasis_',
				'<em data-markdown-marker="_">emphasis</em>',
			],
			[
				'strong',
				'__strong__',
				'<strong data-markdown-marker="_">strong</strong>',
			],
			[
				'a nested pair',
				'__strong with _emphasis_ inside__',
				'<strong data-markdown-marker="_">strong with <em data-markdown-marker="_">emphasis</em> inside</strong>',
			],
			[
				'both markers at once',
				'___both___',
				'<em data-markdown-marker="_"><strong data-markdown-marker="_">both</strong></em>',
			],
		] )( 'records the underscore of %s', ( _label, markdown, content ) => {
			const blocks = markdownToBlocks( markdown );
			expect( blocks ).toHaveLength( 1 );
			expect( blocks[ 0 ].attributes ).toEqual( { content } );
		} );

		it.each( [
			[ 'emphasis', '*emphasis*', '<em>emphasis</em>' ],
			[ 'strong', '**strong**', '<strong>strong</strong>' ],
			[
				'a nested pair',
				'**bold with *italic* inside**',
				'<strong>bold with <em>italic</em> inside</strong>',
			],
		] )(
			'leaves the asterisk of %s unrecorded',
			( _label, markdown, content ) => {
				expect( markdownToBlocks( markdown )[ 0 ].attributes ).toEqual(
					{ content }
				);
			}
		);

		it( 'records each marker of a mixed line on its own node', () => {
			expect( markdownToBlocks( '_a_ and *b*' )[ 0 ].attributes ).toEqual(
				{
					content:
						'<em data-markdown-marker="_">a</em> and <em>b</em>',
				}
			);
		} );
	} );

	describe( 'blocks-to-markdown', () => {
		it.each( [
			[ 'emphasis', '<em data-markdown-marker="_">x</em>', '_x_\n' ],
			[
				'strong',
				'<strong data-markdown-marker="_">x</strong>',
				'__x__\n',
			],
		] )(
			'writes %s back with its recorded marker',
			( _label, content, markdown ) => {
				expect(
					blocksToMarkdown( [ paragraphBlock( content ) ] )
				).toBe( markdown );
			}
		);

		it.each( [
			[ 'emphasis', '<em>x</em>', '*x*\n' ],
			[ 'strong', '<strong>x</strong>', '**x**\n' ],
		] )(
			'writes %s with the default marker when none is recorded',
			( _label, content, markdown ) => {
				expect(
					blocksToMarkdown( [ paragraphBlock( content ) ] )
				).toBe( markdown );
			}
		);

		it.each( [
			[
				'the inner node carries no marker',
				'<strong data-markdown-marker="_">a <em>b</em> c</strong>',
				'__a *b* c__\n',
			],
			[
				'the outer node carries no marker',
				'<strong>a <em data-markdown-marker="_">b</em> c</strong>',
				'**a _b_ c**\n',
			],
		] )(
			'keeps the markers apart when %s',
			( _label, content, markdown ) => {
				expect(
					blocksToMarkdown( [ paragraphBlock( content ) ] )
				).toBe( markdown );
			}
		);

		it.each( [
			[
				'an underscore before an asterisk',
				'<em data-markdown-marker="_">a</em><em>b</em>',
				'_a_*b*\n',
			],
			[
				'an asterisk before an underscore',
				'<em>a</em><em data-markdown-marker="_">b</em>',
				'*a*_b_\n',
			],
		] )(
			'writes adjacent siblings unescaped: %s',
			( _label, content, markdown ) => {
				expect(
					blocksToMarkdown( [ paragraphBlock( content ) ] )
				).toBe( markdown );
			}
		);
	} );

	describe( 'roundtrip', () => {
		it.each( [
			[ 'underscore emphasis', '_emphasis_' ],
			[ 'asterisk emphasis', '*emphasis*' ],
			[ 'underscore strong', '__strong__' ],
			[ 'asterisk strong', '**strong**' ],
			[ 'both markers at once', '___both___' ],
			[ 'an underscore pair', '__strong with _emphasis_ inside__' ],
			[ 'an asterisk pair', '**bold with *italic* inside**' ],
			[ 'a mixed pair', '**bold with _italic_ inside**' ],
			[ 'both markers on one line', '_a_ and *b*' ],
			[ 'adjacent siblings', '*a*_b_' ],
			[ 'a marker in a heading', '# _heading_' ],
			[ 'a marker in a list item', '- _item_' ],
			[ 'a marker in a quote', '> _quote_' ],
			[
				'an escaped marker',
				'A literal \\_underscore\\_ and \\*asterisk\\*',
			],
		] )( 'preserves %s', ( _label, markdown ) => {
			expect( blocksToMarkdown( markdownToBlocks( markdown ) ) ).toBe(
				markdown + '\n'
			);
		} );
	} );
} );
