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

function headingBlock( attributes: Block[ 'attributes' ] ): Block {
	return {
		name: 'core/heading',
		clientId: 'test-id',
		attributes,
		innerBlocks: [],
		isValid: true,
	};
}

describe( 'core/heading', () => {
	describe( 'markdown-to-blocks', () => {
		it( 'converts an atx heading', () => {
			expect( markdownToBlocks( '# Hello' ) ).toEqual( [
				{
					name: 'core/heading',
					clientId: expect.any( String ),
					attributes: {
						content: 'Hello',
						level: 1,
						markdownData: { format: 'atx' },
					},
					innerBlocks: [],
					isValid: true,
				},
			] );
		} );

		it( 'converts atx headings at every level 1-6', () => {
			const md = [
				'# h1',
				'## h2',
				'### h3',
				'#### h4',
				'##### h5',
				'###### h6',
			].join( '\n\n' );
			const blocks = markdownToBlocks( md );
			expect( blocks ).toHaveLength( 6 );
			blocks.forEach( ( block, index ) => {
				expect( block.name ).toBe( 'core/heading' );
				expect( block.attributes ).toEqual( {
					content: `h${ index + 1 }`,
					level: index + 1,
					markdownData: { format: 'atx' },
				} );
			} );
		} );

		it( 'converts a setext h1 heading and records markdownData.format', () => {
			const blocks = markdownToBlocks( 'Hello\n=====' );
			expect( blocks ).toHaveLength( 1 );
			expect( blocks[ 0 ].name ).toBe( 'core/heading' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				content: 'Hello',
				level: 1,
				markdownData: { format: 'setext' },
			} );
		} );

		it( 'converts a setext h2 heading and records markdownData.format', () => {
			const blocks = markdownToBlocks( 'Hello\n-----' );
			expect( blocks ).toHaveLength( 1 );
			expect( blocks[ 0 ].name ).toBe( 'core/heading' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				content: 'Hello',
				level: 2,
				markdownData: { format: 'setext' },
			} );
		} );
	} );

	describe( 'blocks-to-markdown', () => {
		it( 'converts a heading block at level 1', () => {
			expect(
				blocksToMarkdown( [
					headingBlock( { level: 1, content: 'Hello' } ),
				] )
			).toBe( '# Hello\n' );
		} );

		it( 'converts heading blocks at every level 1-6', () => {
			for ( let level = 1; level <= 6; level++ ) {
				const prefix = '#'.repeat( level );
				expect(
					blocksToMarkdown( [
						headingBlock( { level, content: `h${ level }` } ),
					] )
				).toBe( `${ prefix } h${ level }\n` );
			}
		} );

		it( 'escapes markdown special characters in heading content', () => {
			expect(
				blocksToMarkdown( [
					headingBlock( { level: 2, content: '*not italic*' } ),
				] )
			).toBe( '## \\*not italic\\*\n' );
		} );

		it( 'converts <br> in heading content to a hard break (falls back to setext since atx is single-line)', () => {
			expect(
				blocksToMarkdown( [
					headingBlock( { level: 2, content: 'line1<br>line2' } ),
				] )
			).toBe( 'line1\\\nline2\n-----\n' );
		} );

		it( 'preserves setext format when markdownData.format is "setext"', () => {
			expect(
				blocksToMarkdown( [
					headingBlock( {
						level: 1,
						content: 'Hello',
						markdownData: { format: 'setext' },
					} ),
				] )
			).toBe( 'Hello\n=====\n' );
			expect(
				blocksToMarkdown( [
					headingBlock( {
						level: 2,
						content: 'Hello',
						markdownData: { format: 'setext' },
					} ),
				] )
			).toBe( 'Hello\n-----\n' );
		} );
	} );

	describe( 'roundtrip', () => {
		it( 'preserves setext h1 format', () => {
			const md = 'Hello\n=====\n';
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'preserves setext h2 format', () => {
			const md = 'Hello\n-----\n';
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'preserves atx format', () => {
			const md = '# Hello\n';
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );
	} );
} );
