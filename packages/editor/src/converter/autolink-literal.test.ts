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
import { markdownToBlocks, blocksToMarkdown } from '.';

function paragraphBlock( content: string ): Block {
	return {
		name: 'core/paragraph',
		clientId: 'test-id',
		attributes: { content },
		innerBlocks: [],
		isValid: true,
	};
}

describe( 'autolink literals', () => {
	describe( 'markdown-to-blocks', () => {
		it.each( [
			[
				'a URL',
				'Hello http://google.com World',
				'Hello <a href="http://google.com">http://google.com</a> World',
			],
			[
				'a www address',
				'Visit www.example.com today',
				'Visit <a href="http://www.example.com">www.example.com</a> today',
			],
			[
				'an email address',
				'Mail user@example.com now',
				'Mail <a href="mailto:user@example.com">user@example.com</a> now',
			],
		] )( 'links %s written on its own', ( _label, markdown, content ) => {
			const blocks = markdownToBlocks( markdown );
			expect( blocks ).toHaveLength( 1 );
			expect( blocks[ 0 ].attributes ).toEqual( { content } );
		} );
	} );

	describe( 'blocks-to-markdown', () => {
		it.each( [
			[
				'a URL',
				'Hello <a href="http://google.com">http://google.com</a> World',
				'Hello http://google.com World\n',
			],
			[
				'a www address',
				'Visit <a href="http://www.example.com">www.example.com</a> today',
				'Visit www.example.com today\n',
			],
			[
				'an email address',
				'Mail <a href="mailto:user@example.com">user@example.com</a> now',
				'Mail user@example.com now\n',
			],
		] )(
			'writes %s back as a bare literal',
			( _label, content, markdown ) => {
				expect(
					blocksToMarkdown( [ paragraphBlock( content ) ] )
				).toBe( markdown );
			}
		);

		it.each( [
			[
				'the URL runs into the word after it',
				'see <a href="https://example.com">https://example.com</a>x',
				'see <https://example.com>x\n',
			],
			[
				'the URL would be cut short',
				'<a href="https://example.com/x)">https://example.com/x)</a>',
				'<https://example.com/x)>\n',
			],
			[
				'the link carries a title',
				'<a href="https://example.com" title="a title">https://example.com</a>',
				'[https://example.com](https://example.com "a title")\n',
			],
			[
				'the text differs from the URL',
				'<a href="https://example.com">text</a>',
				'[text](https://example.com)\n',
			],
		] )(
			'keeps the explicit syntax when %s',
			( _label, content, markdown ) => {
				expect(
					blocksToMarkdown( [ paragraphBlock( content ) ] )
				).toBe( markdown );
			}
		);
	} );

	describe( 'roundtrip', () => {
		it.each( [
			[ 'a URL', 'Hello http://google.com World' ],
			[ 'a www address', 'Visit www.example.com today' ],
			[ 'an email address', 'Mail user@example.com now' ],
			[ 'an uppercase URL', 'HTTPS://EXAMPLE.COM' ],
			[
				'a literal in parentheses',
				'See (https://example.com) for more',
			],
			[ 'a literal ending a sentence', 'Go to https://example.com.' ],
			[
				'a literal with parentheses in its path',
				'https://example.com/path_(x)_y done',
			],
			[ 'a literal inside strong', 'A **bold https://example.com** end' ],
			[
				'a literal after inline code',
				'A `code` https://example.com end',
			],
			[
				'a literal on a soft-wrapped line',
				'Line one\nhttps://example.com next',
			],
			[ 'a literal in a heading', '# Heading https://example.com' ],
			[ 'a literal in a list item', '- item https://example.com' ],
			[ 'a literal in a quote', '> quote https://example.com' ],
			[
				'a labelled link that holds a URL',
				'[text](https://example.com)',
			],
		] )( 'preserves %s', ( _label, markdown ) => {
			expect( blocksToMarkdown( markdownToBlocks( markdown ) ) ).toBe(
				markdown + '\n'
			);
		} );

		it( 'preserves a literal after a hard break', () => {
			const markdown = 'Hard break\\\nhttps://example.com next';
			expect( blocksToMarkdown( markdownToBlocks( markdown ) ) ).toBe(
				markdown + '\n'
			);
		} );

		it( 'normalizes an explicit autolink to a literal', () => {
			// Both syntaxes parse to the same Link node, so the bare literal
			// — which GFM renders identically — is written back.
			expect(
				blocksToMarkdown( markdownToBlocks( '<https://example.com>' ) )
			).toBe( 'https://example.com\n' );
		} );
	} );
} );
