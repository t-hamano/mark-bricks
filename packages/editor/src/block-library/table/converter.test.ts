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

function tableBlock( attributes: BlockAttributes ): Block {
	return {
		name: 'core/table',
		clientId: 'test-id',
		attributes,
		innerBlocks: [],
		isValid: true,
	};
}

// Joins Markdown lines into a single string with a trailing newline, matching
// what `blocksToMarkdown` emits.
function markdown( ...lines: string[] ): string {
	return lines.join( '\n' ) + '\n';
}

describe( 'core/table', () => {
	describe( 'markdown-to-blocks', () => {
		it( 'converts a basic table', () => {
			const md = markdown(
				'| Name | Age |',
				'| ---- | --- |',
				'| John | 30  |'
			);
			expect( markdownToBlocks( md ) ).toEqual( [
				{
					name: 'core/table',
					clientId: expect.any( String ),
					attributes: {
						head: [
							{
								cells: [
									{ content: 'Name', tag: 'th' },
									{ content: 'Age', tag: 'th' },
								],
							},
						],
						body: [
							{
								cells: [
									{ content: 'John', tag: 'td' },
									{ content: '30', tag: 'td' },
								],
							},
						],
						foot: [],
					},
					innerBlocks: [],
					isValid: true,
				},
			] );
		} );

		it( 'copies column alignment onto every cell', () => {
			const md = markdown(
				'| Left | Center | Right |',
				'| :--- | :----: | ----: |',
				'| a    | b      | c     |'
			);
			const blocks = markdownToBlocks( md );
			expect( blocks[ 0 ].name ).toBe( 'core/table' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				head: [
					{
						cells: [
							{ content: 'Left', tag: 'th', align: 'left' },
							{ content: 'Center', tag: 'th', align: 'center' },
							{ content: 'Right', tag: 'th', align: 'right' },
						],
					},
				],
				body: [
					{
						cells: [
							{ content: 'a', tag: 'td', align: 'left' },
							{ content: 'b', tag: 'td', align: 'center' },
							{ content: 'c', tag: 'td', align: 'right' },
						],
					},
				],
				foot: [],
			} );
		} );

		it( 'handles a table with multiple body rows', () => {
			const md = markdown(
				'| Name |',
				'| ---- |',
				'| John |',
				'| Bob  |'
			);
			const block = markdownToBlocks( md )[ 0 ];
			expect( block.name ).toBe( 'core/table' );
			const { body } = block.attributes as BlockAttributes;
			expect( body ).toHaveLength( 2 );
		} );

		it( 'maps per-column alignment, leaving unaligned columns blank', () => {
			const md = markdown(
				// prettier-ignore
				'| A | B | C |',
				'| :- | --- | -: |',
				'| x | y | z |'
			);
			const blocks = markdownToBlocks( md );
			expect( blocks[ 0 ].name ).toBe( 'core/table' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				head: [
					{
						cells: [
							{ content: 'A', tag: 'th', align: 'left' },
							{ content: 'B', tag: 'th' },
							{ content: 'C', tag: 'th', align: 'right' },
						],
					},
				],
				body: [
					{
						cells: [
							{ content: 'x', tag: 'td', align: 'left' },
							{ content: 'y', tag: 'td' },
							{ content: 'z', tag: 'td', align: 'right' },
						],
					},
				],
				foot: [],
			} );
		} );
	} );

	describe( 'blocks-to-markdown', () => {
		it( 'converts a basic table', () => {
			const md = blocksToMarkdown( [
				tableBlock( {
					head: [
						{
							cells: [
								{ content: 'Name', tag: 'th' },
								{ content: 'Age', tag: 'th' },
							],
						},
					],
					body: [
						{
							cells: [
								{ content: 'John', tag: 'td' },
								{ content: '30', tag: 'td' },
							],
						},
					],
					foot: [],
				} ),
			] );
			expect( md ).toBe(
				markdown(
					// prettier-ignore
					'| Name | Age |',
					'| ---- | --- |',
					'| John | 30  |'
				)
			);
		} );

		it( 'emits column alignment from the header cells', () => {
			const md = blocksToMarkdown( [
				tableBlock( {
					head: [
						{
							cells: [
								{ content: 'L', tag: 'th', align: 'left' },
								{ content: 'C', tag: 'th', align: 'center' },
								{ content: 'R', tag: 'th', align: 'right' },
							],
						},
					],
					body: [
						{
							cells: [
								{ content: 'a', tag: 'td' },
								{ content: 'b', tag: 'td' },
								{ content: 'c', tag: 'td' },
							],
						},
					],
					foot: [],
				} ),
			] );
			expect( md ).toBe(
				markdown(
					'| L  |  C  |  R |',
					'| :- | :-: | -: |',
					'| a  |  b  |  c |'
				)
			);
		} );

		it( 'appends footer rows to the body', () => {
			const md = blocksToMarkdown( [
				tableBlock( {
					head: [ { cells: [ { content: 'H', tag: 'th' } ] } ],
					body: [ { cells: [ { content: 'B', tag: 'td' } ] } ],
					foot: [ { cells: [ { content: 'F', tag: 'td' } ] } ],
				} ),
			] );
			expect( md ).toBe(
				markdown(
					// prettier-ignore
					'| H |',
					'| - |',
					'| B |',
					'| F |'
				)
			);
		} );

		it( 'demotes extra header rows to the top of the body', () => {
			const md = blocksToMarkdown( [
				tableBlock( {
					head: [
						{ cells: [ { content: 'H1', tag: 'th' } ] },
						{ cells: [ { content: 'H2', tag: 'th' } ] },
					],
					body: [ { cells: [ { content: 'B', tag: 'td' } ] } ],
					foot: [],
				} ),
			] );
			expect( md ).toBe(
				markdown(
					// prettier-ignore
					'| H1 |',
					'| -- |',
					'| H2 |',
					'| B  |'
				)
			);
		} );

		it( 'synthesizes a blank header row for an empty head', () => {
			const md = blocksToMarkdown( [
				tableBlock( {
					head: [],
					body: [
						{
							cells: [
								{ content: 'a', tag: 'td' },
								{ content: 'b', tag: 'td' },
							],
						},
					],
					foot: [],
				} ),
			] );
			expect( md ).toBe(
				markdown(
					// prettier-ignore
					'|   |   |',
					'| - | - |',
					'| a | b |'
				)
			);
		} );

		it( 'pads a short row to the column count', () => {
			const md = blocksToMarkdown( [
				tableBlock( {
					head: [
						{
							cells: [
								{ content: 'A', tag: 'th' },
								{ content: 'B', tag: 'th' },
							],
						},
					],
					body: [ { cells: [ { content: 'x', tag: 'td' } ] } ],
					foot: [],
				} ),
			] );
			expect( md ).toBe(
				markdown(
					// prettier-ignore
					'| A | B |',
					'| - | - |',
					'| x |   |'
				)
			);
		} );
	} );

	describe( 'roundtrip', () => {
		it( 'preserves a basic table', () => {
			const md = markdown(
				'| Name | Age |',
				'| ---- | --- |',
				'| John | 30  |'
			);
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'preserves column alignment', () => {
			const md = markdown(
				'| Left | Center | Right |',
				'| :--- | :----: | ----: |',
				'| a    |    b   |     c |'
			);
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'preserves a pipe escaped in cell content', () => {
			// A literal `|` in a cell is escaped as `\|`; it round-trips in
			// both header and body cells.
			const md = markdown(
				// prettier-ignore
				'| a \\| b |',
				'| ------ |',
				'| e \\| f |'
			);
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );
	} );
} );
