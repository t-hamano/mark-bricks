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
import type { SeparatorFormat } from './types';

function separatorBlock( format: SeparatorFormat ): Block {
	return {
		name: 'core/separator',
		clientId: 'test-id',
		attributes: { markdownData: { format } },
		innerBlocks: [],
		isValid: true,
	};
}

describe( 'core/separator', () => {
	describe( 'markdown-to-blocks', () => {
		it( 'detects a dash thematic break', () => {
			expect( markdownToBlocks( '---' ) ).toEqual( [
				{
					name: 'core/separator',
					clientId: expect.any( String ),
					attributes: {
						markdownData: {
							format: {
								marker: '-',
								repetition: 3,
								spaces: false,
							},
						},
					},
					innerBlocks: [],
					isValid: true,
				},
			] );
		} );

		it( 'detects an asterisk thematic break', () => {
			const blocks = markdownToBlocks( '***' );
			expect( blocks[ 0 ].name ).toBe( 'core/separator' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				markdownData: {
					format: { marker: '*', repetition: 3, spaces: false },
				},
			} );
		} );

		it( 'detects an underscore thematic break', () => {
			const blocks = markdownToBlocks( '___' );
			expect( blocks[ 0 ].name ).toBe( 'core/separator' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				markdownData: {
					format: { marker: '_', repetition: 3, spaces: false },
				},
			} );
		} );

		it( 'preserves the marker count', () => {
			const blocks = markdownToBlocks( '-----' );
			expect( blocks[ 0 ].name ).toBe( 'core/separator' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				markdownData: {
					format: { marker: '-', repetition: 5, spaces: false },
				},
			} );
		} );

		it( 'detects the spaced style', () => {
			const blocks = markdownToBlocks( '- - -' );
			expect( blocks[ 0 ].name ).toBe( 'core/separator' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				markdownData: {
					format: { marker: '-', repetition: 3, spaces: true },
				},
			} );
		} );
	} );

	describe( 'blocks-to-markdown', () => {
		it( 'emits a dash thematic break', () => {
			expect(
				blocksToMarkdown( [
					separatorBlock( {
						marker: '-',
						repetition: 3,
						spaces: false,
					} ),
				] )
			).toBe( '---\n' );
		} );

		it( 'emits an asterisk thematic break', () => {
			expect(
				blocksToMarkdown( [
					separatorBlock( {
						marker: '*',
						repetition: 3,
						spaces: false,
					} ),
				] )
			).toBe( '***\n' );
		} );

		it( 'emits the spaced style', () => {
			expect(
				blocksToMarkdown( [
					separatorBlock( {
						marker: '-',
						repetition: 3,
						spaces: true,
					} ),
				] )
			).toBe( '- - -\n' );
		} );
	} );

	describe( 'roundtrip', () => {
		it.each( [ '---\n', '***\n', '___\n', '-----\n', '- - -\n' ] )(
			'preserves %j',
			( md ) => {
				expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
			}
		);
	} );
} );
