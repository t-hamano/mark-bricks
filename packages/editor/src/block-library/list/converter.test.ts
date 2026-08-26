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

function listItem(
	content: string,
	innerBlocks: Block[] = [],
	markdownData?: { checked?: boolean }
): Block {
	return {
		name: 'core/list-item',
		clientId: 'test-id',
		attributes: markdownData ? { content, markdownData } : { content },
		innerBlocks,
		isValid: true,
	};
}

function list( attributes: BlockAttributes, innerBlocks: Block[] ): Block {
	return {
		name: 'core/list',
		clientId: 'test-id',
		attributes,
		innerBlocks,
		isValid: true,
	};
}

// Joins Markdown lines into a single string with a trailing newline, matching
// what `blocksToMarkdown` emits.
function markdown( ...lines: string[] ): string {
	return lines.join( '\n' ) + '\n';
}

describe( 'core/list', () => {
	describe( 'markdown-to-blocks', () => {
		it( 'converts an unordered list', () => {
			const blocks = markdownToBlocks( markdown( '- one', '- two' ) );
			expect( blocks ).toHaveLength( 1 );
			expect( blocks[ 0 ].name ).toBe( 'core/list' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				ordered: false,
				markdownData: { marker: '-', spread: false, spacing: 1 },
			} );
			expect( blocks[ 0 ].innerBlocks ).toHaveLength( 2 );
			expect( blocks[ 0 ].innerBlocks[ 0 ].name ).toBe(
				'core/list-item'
			);
			expect( blocks[ 0 ].innerBlocks[ 0 ].attributes ).toEqual( {
				content: 'one',
			} );
		} );

		it( 'detects the bullet marker', () => {
			const star = markdownToBlocks( markdown( '* one' ) );
			expect( star[ 0 ].name ).toBe( 'core/list' );
			expect( star[ 0 ].attributes ).toEqual( {
				ordered: false,
				markdownData: { marker: '*', spread: false, spacing: 1 },
			} );
			const plus = markdownToBlocks( markdown( '+ one' ) );
			expect( plus[ 0 ].name ).toBe( 'core/list' );
			expect( plus[ 0 ].attributes ).toEqual( {
				ordered: false,
				markdownData: { marker: '+', spread: false, spacing: 1 },
			} );
		} );

		it( 'converts an ordered list', () => {
			const blocks = markdownToBlocks( markdown( '1. one', '2. two' ) );
			expect( blocks[ 0 ].name ).toBe( 'core/list' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				ordered: true,
				markdownData: { marker: '.', spread: false, spacing: 1 },
			} );
		} );

		it( 'detects the ordered delimiter', () => {
			const blocks = markdownToBlocks( markdown( '1) one' ) );
			expect( blocks[ 0 ].name ).toBe( 'core/list' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				ordered: true,
				markdownData: { marker: ')', spread: false, spacing: 1 },
			} );
		} );

		it( 'detects the marker spacing', () => {
			const unordered = markdownToBlocks( markdown( '-   one' ) );
			expect( unordered[ 0 ].name ).toBe( 'core/list' );
			expect( unordered[ 0 ].attributes ).toEqual( {
				ordered: false,
				markdownData: { marker: '-', spread: false, spacing: 3 },
			} );
			const ordered = markdownToBlocks( markdown( '1.  one' ) );
			expect( ordered[ 0 ].name ).toBe( 'core/list' );
			expect( ordered[ 0 ].attributes ).toEqual( {
				ordered: true,
				markdownData: { marker: '.', spread: false, spacing: 2 },
			} );
		} );

		it( 'detects the marker spacing of a nested list separately', () => {
			const blocks = markdownToBlocks(
				markdown( '-   one', '    -  nested' )
			);
			expect( blocks[ 0 ].name ).toBe( 'core/list' );
			expect(
				( blocks[ 0 ].attributes as BlockAttributes ).markdownData
					.spacing
			).toBe( 3 );
			const nested = blocks[ 0 ].innerBlocks[ 0 ].innerBlocks[ 0 ];
			expect( nested.name ).toBe( 'core/list' );
			expect(
				( nested.attributes as BlockAttributes ).markdownData.spacing
			).toBe( 2 );
		} );

		it( 'preserves a non-default start number', () => {
			const blocks = markdownToBlocks(
				markdown( '3. three', '4. four' )
			);
			expect( blocks[ 0 ].name ).toBe( 'core/list' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				ordered: true,
				start: 3,
				markdownData: { marker: '.', spread: false, spacing: 1 },
			} );
		} );

		it( 'detects a loose list', () => {
			const blocks = markdownToBlocks( markdown( '- one', '', '- two' ) );
			expect( blocks[ 0 ].name ).toBe( 'core/list' );
			expect(
				( blocks[ 0 ].attributes as BlockAttributes ).markdownData
					.spread
			).toBe( true );
		} );

		it( 'converts a nested list into a child core/list', () => {
			const blocks = markdownToBlocks(
				markdown( '- one', '  - nested', '- two' )
			);
			const [ first ] = blocks[ 0 ].innerBlocks;
			expect( first.innerBlocks ).toHaveLength( 1 );
			expect( blocks[ 0 ].name ).toBe( 'core/list' );
			expect( first.name ).toBe( 'core/list-item' );
			expect( first.innerBlocks[ 0 ].name ).toBe( 'core/list' );
			expect( first.innerBlocks[ 0 ].innerBlocks[ 0 ].name ).toBe(
				'core/list-item'
			);
			expect(
				first.innerBlocks[ 0 ].innerBlocks[ 0 ].attributes
			).toEqual( { content: 'nested' } );
		} );

		it( 'reads the checked state of task items', () => {
			const blocks = markdownToBlocks(
				markdown( '- [ ] todo', '- [x] done', '- plain' )
			);
			expect( blocks[ 0 ].name ).toBe( 'core/list' );
			const [ todo, done, plain ] = blocks[ 0 ].innerBlocks;
			expect( todo.name ).toBe( 'core/list-item' );
			expect( todo.attributes ).toEqual( {
				content: 'todo',
				markdownData: { checked: false },
			} );
			expect( done.name ).toBe( 'core/list-item' );
			expect( done.attributes ).toEqual( {
				content: 'done',
				markdownData: { checked: true },
			} );
			// An ordinary item carries no `markdownData`.
			expect( plain.name ).toBe( 'core/list-item' );
			expect( plain.attributes ).toEqual( { content: 'plain' } );
		} );
	} );

	describe( 'blocks-to-markdown', () => {
		it( 'converts an unordered list', () => {
			expect(
				blocksToMarkdown( [
					list(
						{
							ordered: false,
							markdownData: {
								marker: '-',
								spread: false,
								spacing: 1,
							},
						},
						[ listItem( 'one' ), listItem( 'two' ) ]
					),
				] )
			).toBe( markdown( '- one', '- two' ) );
		} );

		it( 'emits the stored bullet marker', () => {
			expect(
				blocksToMarkdown( [
					list(
						{
							ordered: false,
							markdownData: {
								marker: '*',
								spread: false,
								spacing: 1,
							},
						},
						[ listItem( 'one' ) ]
					),
				] )
			).toBe( markdown( '* one' ) );
		} );

		it( 'converts an ordered list', () => {
			expect(
				blocksToMarkdown( [
					list(
						{
							ordered: true,
							markdownData: {
								marker: '.',
								spread: false,
								spacing: 1,
							},
						},
						[ listItem( 'one' ), listItem( 'two' ) ]
					),
				] )
			).toBe( markdown( '1. one', '2. two' ) );
		} );

		it( 'starts an ordered list at the stored number', () => {
			expect(
				blocksToMarkdown( [
					list(
						{
							ordered: true,
							start: 3,
							markdownData: {
								marker: '.',
								spread: false,
								spacing: 1,
							},
						},
						[ listItem( 'three' ), listItem( 'four' ) ]
					),
				] )
			).toBe( markdown( '3. three', '4. four' ) );
		} );

		it( 'emits the stored marker spacing', () => {
			expect(
				blocksToMarkdown( [
					list(
						{
							ordered: false,
							markdownData: {
								marker: '-',
								spread: false,
								spacing: 3,
							},
						},
						[ listItem( 'one' ), listItem( 'two' ) ]
					),
				] )
			).toBe( markdown( '-   one', '-   two' ) );
			expect(
				blocksToMarkdown( [
					list(
						{
							ordered: true,
							markdownData: {
								marker: '.',
								spread: false,
								spacing: 2,
							},
						},
						[ listItem( 'one' ), listItem( 'two' ) ]
					),
				] )
			).toBe( markdown( '1.  one', '2.  two' ) );
		} );

		it( 'indents a nested list to the wider content column', () => {
			expect(
				blocksToMarkdown( [
					list(
						{
							ordered: false,
							markdownData: {
								marker: '-',
								spread: false,
								spacing: 3,
							},
						},
						[
							listItem( 'one', [
								list(
									{
										ordered: false,
										markdownData: {
											marker: '-',
											spread: false,
											spacing: 1,
										},
									},
									[ listItem( 'nested' ) ]
								),
							] ),
							listItem( 'two' ),
						]
					),
				] )
			).toBe( markdown( '-   one', '    - nested', '-   two' ) );
		} );

		it( 'keeps the task marker after a wider marker spacing', () => {
			expect(
				blocksToMarkdown( [
					list(
						{
							ordered: false,
							markdownData: {
								marker: '-',
								spread: false,
								spacing: 3,
							},
						},
						[
							listItem( 'todo', [], { checked: false } ),
							listItem( 'done', [], { checked: true } ),
							listItem( 'plain' ),
						]
					),
				] )
			).toBe( markdown( '-   [ ] todo', '-   [x] done', '-   plain' ) );
		} );

		it( 'nests a child core/list under its item', () => {
			expect(
				blocksToMarkdown( [
					list(
						{
							ordered: false,
							markdownData: {
								marker: '-',
								spread: false,
								spacing: 1,
							},
						},
						[
							listItem( 'one', [
								list(
									{
										ordered: false,
										markdownData: {
											marker: '-',
											spread: false,
											spacing: 1,
										},
									},
									[ listItem( 'nested' ) ]
								),
							] ),
							listItem( 'two' ),
						]
					),
				] )
			).toBe( markdown( '- one', '  - nested', '- two' ) );
		} );

		it( 'emits task markers from markdownData.checked', () => {
			expect(
				blocksToMarkdown( [
					list(
						{
							ordered: false,
							markdownData: {
								marker: '-',
								spread: false,
								spacing: 1,
							},
						},
						[
							listItem( 'todo', [], { checked: false } ),
							listItem( 'done', [], { checked: true } ),
							listItem( 'plain' ),
						]
					),
				] )
			).toBe( markdown( '- [ ] todo', '- [x] done', '- plain' ) );
		} );
	} );

	describe( 'roundtrip', () => {
		it( 'preserves an unordered list', () => {
			const md = markdown( '- one', '- two' );
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'preserves a star bullet', () => {
			const md = markdown( '* one', '* two' );
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'preserves an ordered list with a paren delimiter', () => {
			const md = markdown( '1) one', '2) two' );
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'preserves a non-default start number', () => {
			const md = markdown( '3. three', '4. four' );
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'preserves a nested list', () => {
			const md = markdown( '- one', '  - nested', '- two' );
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'preserves a loose list', () => {
			const md = markdown( '- one', '', '- two' );
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'preserves a task list', () => {
			const md = markdown( '- [ ] todo', '- [x] done', '- plain' );
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it.each( [ 1, 2, 3, 4 ] )(
			'preserves a marker followed by %i space(s)',
			( spacing ) => {
				const spaces = ' '.repeat( spacing );
				const md = markdown( `-${ spaces }one`, `-${ spaces }two` );
				expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
			}
		);

		it( 'preserves the marker spacing of an ordered list', () => {
			const md = markdown( '1.  one', '2.  two' );
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'preserves the marker spacing of a nested list', () => {
			const md = markdown( '-   one', '    -  nested', '-   two' );
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'preserves the marker spacing of a loose list', () => {
			const md = markdown( '-   one', '', '-   two' );
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'preserves the marker spacing of a task list', () => {
			const md = markdown( '-  [ ] todo', '-  [x] done', '-  plain' );
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );
	} );
} );
