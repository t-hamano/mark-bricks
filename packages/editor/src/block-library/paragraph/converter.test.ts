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
import { markdownToBlocks, blocksToMarkdown } from '../../converter';

function paragraphBlock( attributes: Block[ 'attributes' ] ): Block {
	return {
		name: 'core/paragraph',
		clientId: 'test-id',
		attributes,
		innerBlocks: [],
		isValid: true,
	};
}

describe( 'core/paragraph', () => {
	describe( 'markdown-to-blocks', () => {
		it( 'converts a single paragraph', () => {
			expect( markdownToBlocks( 'hello world' ) ).toEqual( [
				{
					name: 'core/paragraph',
					clientId: expect.any( String ),
					attributes: { content: 'hello world' },
					innerBlocks: [],
					isValid: true,
				},
			] );
		} );

		it( 'converts multiple paragraphs separated by blank lines', () => {
			const blocks = markdownToBlocks( 'first\n\nsecond' );
			expect( blocks ).toHaveLength( 2 );
			expect( blocks[ 0 ].name ).toBe( 'core/paragraph' );
			expect( blocks[ 0 ].attributes ).toEqual( { content: 'first' } );
			expect( blocks[ 1 ].name ).toBe( 'core/paragraph' );
			expect( blocks[ 1 ].attributes ).toEqual( { content: 'second' } );
		} );

		it( 'preserves a soft break (single newline) within a paragraph', () => {
			const blocks = markdownToBlocks( 'line1\nline2' );
			expect( blocks ).toHaveLength( 1 );
			expect( blocks[ 0 ].name ).toBe( 'core/paragraph' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				content: 'line1\nline2',
			} );
		} );

		it( 'converts a hard break (two trailing spaces + newline) to <br>', () => {
			const blocks = markdownToBlocks( 'line1  \nline2' );
			expect( blocks ).toHaveLength( 1 );
			expect( blocks[ 0 ].name ).toBe( 'core/paragraph' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				content: 'line1<br>line2',
			} );
		} );

		it.each( [
			[ 'emphasis', '*italic*', '<em>italic</em>' ],
			[ 'strong', '**bold**', '<strong>bold</strong>' ],
			[ 'inline code', '`code`', '<code>code</code>' ],
			[ 'strikethrough', '~~struck~~', '<s>struck</s>' ],
			[
				'link',
				'[text](https://example.com)',
				'<a href="https://example.com">text</a>',
			],
			[
				'link with a title',
				'[text](https://example.com "a title")',
				'<a href="https://example.com" title="a title">text</a>',
			],
		] )(
			'converts %s to formatted content',
			( _label, markdown, content ) => {
				const blocks = markdownToBlocks( markdown );
				expect( blocks ).toHaveLength( 1 );
				expect( blocks[ 0 ].attributes ).toEqual( { content } );
			}
		);

		it( 'escapes HTML special characters in text content', () => {
			const blocks = markdownToBlocks( 'a < b & c' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				content: 'a &lt; b &amp; c',
			} );
		} );

		it( 'converts an inline image to <img>', () => {
			const blocks = markdownToBlocks( 'Text ![Alt](image.png)' );
			expect( blocks[ 0 ].name ).toBe( 'core/paragraph' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				content: 'Text <img src="image.png" alt="Alt">',
			} );
		} );

		it( 'records a single-quoted image title on the <img>', () => {
			const blocks = markdownToBlocks(
				"Text ![Alt](image.png 'A title')"
			);
			expect( blocks[ 0 ].attributes ).toEqual( {
				content:
					'Text <img src="image.png" alt="Alt" title="A title" data-markdown-title-quote="\'">',
			} );
		} );

		it( 'converts a linked image to <img> inside <a>', () => {
			const blocks = markdownToBlocks(
				'[![Badge](badge.svg)](https://example.com)\n[![Badge](badge.svg)](https://example.com)'
			);
			expect( blocks[ 0 ].name ).toBe( 'core/paragraph' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				content:
					'<a href="https://example.com"><img src="badge.svg" alt="Badge"></a>\n<a href="https://example.com"><img src="badge.svg" alt="Badge"></a>',
			} );
		} );
	} );

	describe( 'blocks-to-markdown', () => {
		it( 'converts a single paragraph block', () => {
			expect(
				blocksToMarkdown( [
					paragraphBlock( { content: 'hello world' } ),
				] )
			).toBe( 'hello world\n' );
		} );

		it( 'separates multiple paragraph blocks with a blank line', () => {
			expect(
				blocksToMarkdown( [
					paragraphBlock( { content: 'first' } ),
					paragraphBlock( { content: 'second' } ),
				] )
			).toBe( 'first\n\nsecond\n' );
		} );

		it( 'outputs an empty string for an empty paragraph block', () => {
			expect(
				blocksToMarkdown( [ paragraphBlock( { content: '' } ) ] )
			).toBe( '' );
		} );

		it( 'escapes markdown special characters in content', () => {
			expect(
				blocksToMarkdown( [
					paragraphBlock( { content: '*not italic*' } ),
				] )
			).toBe( '\\*not italic\\*\n' );
			expect(
				blocksToMarkdown( [
					paragraphBlock( { content: '# not heading' } ),
				] )
			).toBe( '\\# not heading\n' );
			expect(
				blocksToMarkdown( [
					paragraphBlock( { content: '- not list' } ),
				] )
			).toBe( '\\- not list\n' );
		} );

		it( 'preserves a soft break (single newline) within paragraph content', () => {
			expect(
				blocksToMarkdown( [
					paragraphBlock( { content: 'line1\nline2' } ),
				] )
			).toBe( 'line1\nline2\n' );
		} );

		it( 'converts <br> in content to a hard break', () => {
			expect(
				blocksToMarkdown( [
					paragraphBlock( {
						content:
							'Welcome to WordPress.<br>This is your first post. Edit or delete it, then start writing!',
					} ),
				] )
			).toBe(
				'Welcome to WordPress.\\\nThis is your first post. Edit or delete it, then start writing!\n'
			);
		} );

		it.each( [
			[ 'emphasis', '<em>italic</em>', '*italic*\n' ],
			[ 'strong', '<strong>bold</strong>', '**bold**\n' ],
			[ 'inline code', '<code>code</code>', '`code`\n' ],
			[ 'strikethrough', '<s>struck</s>', '~~struck~~\n' ],
			[
				'link',
				'<a href="https://example.com">text</a>',
				'[text](https://example.com)\n',
			],
			[
				'link with a title',
				'<a href="https://example.com" title="a title">text</a>',
				'[text](https://example.com "a title")\n',
			],
		] )(
			'converts formatted content of %s to markdown',
			( _label, content, markdown ) => {
				expect(
					blocksToMarkdown( [ paragraphBlock( { content } ) ] )
				).toBe( markdown );
			}
		);

		it.each( [
			[ '<del>', '<del>struck</del>', '~~struck~~\n' ],
			[ '<i>', '<i>italic</i>', '*italic*\n' ],
			[ '<b>', '<b>bold</b>', '**bold**\n' ],
		] )(
			'accepts %s as an alias tag in content',
			( _label, content, markdown ) => {
				expect(
					blocksToMarkdown( [ paragraphBlock( { content } ) ] )
				).toBe( markdown );
			}
		);

		it( 'decodes HTML entities in content', () => {
			expect(
				blocksToMarkdown( [
					paragraphBlock( { content: '<code>a &amp; b</code>' } ),
				] )
			).toBe( '`a & b`\n' );
		} );

		it( 'unwraps an unknown tag in content, keeping its text', () => {
			expect(
				blocksToMarkdown( [
					paragraphBlock( { content: 'a <mark>b</mark> c' } ),
				] )
			).toBe( 'a b c\n' );
		} );

		it( 'converts <img> in content to an inline image', () => {
			expect(
				blocksToMarkdown( [
					paragraphBlock( {
						content:
							'Text <img src="image.png" alt="Alt" title="A title">',
					} ),
				] )
			).toBe( 'Text ![Alt](image.png "A title")\n' );
		} );
	} );

	describe( 'roundtrip', () => {
		it.each( [
			[ 'emphasis', '*italic*' ],
			[ 'strong', '**bold**' ],
			[ 'inline code', '`code`' ],
			[ 'strikethrough', '~~struck~~' ],
			[ 'link', '[text](https://example.com)' ],
			[ 'link with title', '[text](https://example.com "a title")' ],
			[
				'mixed formatting',
				'Some **bold**, *italic*, ~~struck~~, `code` and a [link](https://example.com).',
			],
			[ 'nested formatting', '**bold *italic***' ],
			[
				'formatting inside a link',
				'[**bold** text](https://example.com)',
			],
			[ 'inline image', 'Text ![Alt](image.png) text' ],
			[ 'inline image without alt', 'Text ![](image.png)' ],
			[
				'inline images with mixed title quotes',
				'![a](a.png "double") and ![b](b.png \'single\')',
			],
			[
				'inline image with a destination in angle brackets',
				'Text ![Alt](<my image.png>)',
			],
			[
				'linked images on consecutive lines',
				'[![Type Check](https://example.com/a.svg?branch=main)](https://example.com/a)\n[![Unit Test](https://example.com/b.svg)](https://example.com/b)',
			],
			[
				'linked image among text',
				'See [![Alt](image.png)](https://example.com) here',
			],
		] )( 'preserves %s', ( _label, markdown ) => {
			expect( blocksToMarkdown( markdownToBlocks( markdown ) ) ).toBe(
				markdown + '\n'
			);
		} );
	} );
} );
