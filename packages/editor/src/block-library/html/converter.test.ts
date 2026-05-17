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

function htmlBlock( attributes: Block[ 'attributes' ] ): Block {
	return {
		name: 'core/html',
		clientId: 'test-id',
		attributes,
		innerBlocks: [],
		isValid: true,
	};
}

describe( 'core/html', () => {
	describe( 'markdown-to-blocks', () => {
		it( 'converts a block-level HTML element', () => {
			expect(
				markdownToBlocks( '<div class="note">Hello</div>' )
			).toEqual( [
				{
					name: 'core/html',
					clientId: expect.any( String ),
					attributes: {
						content: '<div class="note">Hello</div>',
					},
					innerBlocks: [],
					isValid: true,
				},
			] );
		} );

		it( 'preserves multi-line HTML', () => {
			const blocks = markdownToBlocks(
				'<ul>\n<li>one</li>\n<li>two</li>\n</ul>'
			);
			expect( blocks ).toHaveLength( 1 );
			expect( blocks[ 0 ].name ).toBe( 'core/html' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				content: '<ul>\n<li>one</li>\n<li>two</li>\n</ul>',
			} );
		} );

		it( 'preserves an HTML comment', () => {
			const blocks = markdownToBlocks( '<!-- a comment -->' );
			expect( blocks[ 0 ].name ).toBe( 'core/html' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				content: '<!-- a comment -->',
			} );
		} );
	} );

	describe( 'blocks-to-markdown', () => {
		it( 'emits the raw HTML content verbatim', () => {
			expect(
				blocksToMarkdown( [
					htmlBlock( { content: '<div class="note">Hello</div>' } ),
				] )
			).toBe( '<div class="note">Hello</div>\n' );
		} );

		it( 'does not escape markdown characters inside the HTML', () => {
			expect(
				blocksToMarkdown( [
					htmlBlock( { content: '<p>*not italic*</p>' } ),
				] )
			).toBe( '<p>*not italic*</p>\n' );
		} );

		it( 'drops a block with empty content', () => {
			expect( blocksToMarkdown( [ htmlBlock( { content: '' } ) ] ) ).toBe(
				''
			);
		} );
	} );

	describe( 'roundtrip', () => {
		it( 'preserves a block-level HTML element', () => {
			const md = '<div class="note">Hello</div>\n';
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'preserves multi-line HTML', () => {
			const md = '<ul>\n<li>one</li>\n<li>two</li>\n</ul>\n';
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );
	} );
} );
