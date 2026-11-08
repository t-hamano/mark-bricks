/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';
import * as fixtures from '@mark-bricks/fixtures';

/**
 * Internal dependencies
 */
import {
	blocksToMarkdown,
	blockToMarkdown,
	findBlockIndexAtLine,
	getBlockLineRanges,
	getSourceBlockLineRanges,
	joinFrontMatter,
	markdownToBlocks,
	splitFrontMatter,
} from '.';

describe( 'getSourceBlockLineRanges', () => {
	// Checks the ranges against the document as it is written.
	it.each( Object.entries( fixtures ) )(
		'finds the lines of each block of the %s fixture as written',
		( _name, markdown ) => {
			const { body } = splitFrontMatter( markdown );
			const blocks = markdownToBlocks( body );
			const lines = markdown.split( '\n' );

			const ranges = getSourceBlockLineRanges( markdown );
			expect( ranges ).toHaveLength( blocks.length );
			ranges.forEach( ( range ) => {
				expect( range.start ).toBeLessThan( range.end );
				expect( lines[ range.start ].trim() ).not.toBe( '' );
			} );
		}
	);

	it( 'keeps the blank lines and markers of the document', () => {
		expect(
			getSourceBlockLineRanges(
				'---\nmarp: true\n---\n\n\n# A\n\n\n* x\n* y\n\nB\nC\n'
			)
		).toEqual( [
			{ start: 5, end: 6 },
			{ start: 8, end: 10 },
			{ start: 11, end: 13 },
		] );
	} );

	it( 'counts one range for each block of a details element', () => {
		expect(
			getSourceBlockLineRanges(
				'<details>\n<summary>S</summary>\n\nBody\n\n</details>\n\nA\n'
			)
		).toEqual( [
			{ start: 0, end: 6 },
			{ start: 7, end: 8 },
		] );
	} );
} );

describe( 'getBlockLineRanges', () => {
	// Checks the ranges against the document the editor writes.
	it.each( Object.entries( fixtures ) )(
		'finds the lines of each block of the %s fixture',
		( _name, markdown ) => {
			const { frontMatter, body } = splitFrontMatter( markdown );
			const blocks = markdownToBlocks( body );
			const lines = joinFrontMatter(
				frontMatter,
				blocksToMarkdown( blocks )
			).split( '\n' );

			const ranges = getBlockLineRanges( blocks, frontMatter );
			expect( ranges ).toHaveLength( blocks.length );
			ranges.forEach( ( range, index ) => {
				expect( range ).not.toBeNull();
				expect(
					lines.slice( range!.start, range!.end ).join( '\n' )
				).toBe( blockToMarkdown( blocks[ index ] ) );
			} );
		}
	);

	it( 'counts the lines of the front matter', () => {
		const blocks = markdownToBlocks( '# A\n\nB\n' );
		expect( getBlockLineRanges( blocks, null ) ).toEqual( [
			{ start: 0, end: 1 },
			{ start: 2, end: 3 },
		] );
		expect( getBlockLineRanges( blocks, '' )[ 0 ] ).toEqual( {
			start: 3,
			end: 4,
		} );
		expect(
			getBlockLineRanges( blocks, 'marp: true\ntheme: gaia' )[ 0 ]
		).toEqual( { start: 5, end: 6 } );
	} );

	it( 'leaves out the blocks that write nothing', () => {
		const blocks = markdownToBlocks( 'A\n\nB\n' );
		blocks.splice( 1, 0, { ...blocks[ 0 ], name: 'core/unknown' } );
		expect( getBlockLineRanges( blocks, null ) ).toEqual( [
			{ start: 0, end: 1 },
			null,
			{ start: 2, end: 3 },
		] );
	} );
} );

describe( 'findBlockIndexAtLine', () => {
	const ranges = [
		{ start: 4, end: 5 },
		null,
		{ start: 6, end: 9 },
		{ start: 10, end: 11 },
	];

	it( 'finds the block that takes up a line', () => {
		expect( findBlockIndexAtLine( ranges, 4 ) ).toBe( 0 );
		expect( findBlockIndexAtLine( ranges, 7 ) ).toBe( 2 );
		expect( findBlockIndexAtLine( ranges, 10 ) ).toBe( 3 );
	} );

	it( 'falls back to the closest block before a line', () => {
		expect( findBlockIndexAtLine( ranges, 9 ) ).toBe( 2 );
		expect( findBlockIndexAtLine( ranges, 50 ) ).toBe( 3 );
	} );

	it( 'falls back to the first block before every block', () => {
		expect( findBlockIndexAtLine( ranges, 0 ) ).toBe( 0 );
	} );

	it( 'finds nothing when no block writes anything', () => {
		expect( findBlockIndexAtLine( [ null ], 0 ) ).toBe( -1 );
		expect( findBlockIndexAtLine( [], 0 ) ).toBe( -1 );
	} );
} );
