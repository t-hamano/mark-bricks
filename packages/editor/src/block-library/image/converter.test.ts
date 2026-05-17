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
import type { BlockAttributes } from './types';

function imageBlock( attributes: BlockAttributes ): Block {
	return {
		name: 'core/image',
		clientId: 'test-id',
		attributes,
		innerBlocks: [],
		isValid: true,
	};
}

describe( 'core/image', () => {
	describe( 'markdown-to-blocks', () => {
		it( 'converts a standalone image', () => {
			expect( markdownToBlocks( '![Alt text](image.png)' ) ).toEqual( [
				{
					name: 'core/image',
					clientId: expect.any( String ),
					attributes: { url: 'image.png', alt: 'Alt text' },
					innerBlocks: [],
					isValid: true,
				},
			] );
		} );

		it( 'includes the title and quote style when present', () => {
			const blocks = markdownToBlocks( '![Alt](image.png "A title")' );
			expect( blocks[ 0 ].name ).toBe( 'core/image' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				url: 'image.png',
				alt: 'Alt',
				title: 'A title',
				markdownData: { titleQuote: '"' },
			} );
		} );

		it( 'detects a single-quoted title', () => {
			const blocks = markdownToBlocks( "![Alt](image.png 'A title')" );
			expect( blocks[ 0 ].name ).toBe( 'core/image' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				url: 'image.png',
				alt: 'Alt',
				title: 'A title',
				markdownData: { titleQuote: "'" },
			} );
		} );

		it( 'degrades a parenthesised title to a double quote', () => {
			const blocks = markdownToBlocks( '![Alt](image.png (A title))' );
			expect( blocks[ 0 ].name ).toBe( 'core/image' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				url: 'image.png',
				alt: 'Alt',
				title: 'A title',
				markdownData: { titleQuote: '"' },
			} );
		} );

		it( 'handles an empty alt', () => {
			const blocks = markdownToBlocks( '![](image.png)' );
			expect( blocks[ 0 ].name ).toBe( 'core/image' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				url: 'image.png',
				alt: '',
			} );
		} );

		it( 'keeps a paragraph that mixes an image with text', () => {
			expect(
				markdownToBlocks( 'See ![Alt](image.png) here' )[ 0 ].name
			).toBe( 'core/paragraph' );
		} );
	} );

	describe( 'blocks-to-markdown', () => {
		it( 'emits an image', () => {
			expect(
				blocksToMarkdown( [
					imageBlock( { url: 'image.png', alt: 'Alt' } ),
				] )
			).toBe( '![Alt](image.png)\n' );
		} );

		it( 'emits an image with a title', () => {
			expect(
				blocksToMarkdown( [
					imageBlock( {
						url: 'image.png',
						alt: 'Alt',
						title: 'A title',
					} ),
				] )
			).toBe( '![Alt](image.png "A title")\n' );
		} );

		it( 'emits a single-quoted title', () => {
			expect(
				blocksToMarkdown( [
					imageBlock( {
						url: 'image.png',
						alt: 'Alt',
						title: 'A title',
						markdownData: { titleQuote: "'" },
					} ),
				] )
			).toBe( "![Alt](image.png 'A title')\n" );
		} );

		it( 'emits an image with an empty alt', () => {
			expect(
				blocksToMarkdown( [
					imageBlock( { url: 'image.png', alt: '' } ),
				] )
			).toBe( '![](image.png)\n' );
		} );

		it( 'drops an empty title', () => {
			expect(
				blocksToMarkdown( [
					imageBlock( { url: 'image.png', alt: 'Alt', title: '' } ),
				] )
			).toBe( '![Alt](image.png)\n' );
		} );
	} );

	describe( 'roundtrip', () => {
		it.each( [
			'![Alt text](image.png)\n',
			'![](image.png)\n',
			'![Alt](image.png "A title")\n',
			"![Alt](image.png 'A title')\n",
		] )( 'preserves %j', ( md ) => {
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'normalises a parenthesised title to a double quote', () => {
			expect(
				blocksToMarkdown(
					markdownToBlocks( '![Alt](image.png (A title))\n' )
				)
			).toBe( '![Alt](image.png "A title")\n' );
		} );
	} );
} );
