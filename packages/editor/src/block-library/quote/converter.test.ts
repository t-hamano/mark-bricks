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

// Joins Markdown lines into a single string with a trailing newline, matching
// what `blocksToMarkdown` emits.
function markdown( ...lines: string[] ): string {
	return lines.join( '\n' ) + '\n';
}

function paragraph( content: string ): Block {
	return {
		name: 'core/paragraph',
		clientId: 'test-id',
		attributes: { content },
		innerBlocks: [],
		isValid: true,
	};
}

function quote( innerBlocks: Block[] ): Block {
	return {
		name: 'core/quote',
		clientId: 'test-id',
		attributes: {},
		innerBlocks,
		isValid: true,
	};
}

function alert( alertType: string, innerBlocks: Block[] ): Block {
	return {
		name: 'core/quote',
		clientId: 'test-id',
		attributes: { markdownData: { alertType } },
		innerBlocks,
		isValid: true,
	};
}

const ALERT_TYPES = [
	[ 'note', 'NOTE' ],
	[ 'tip', 'TIP' ],
	[ 'important', 'IMPORTANT' ],
	[ 'warning', 'WARNING' ],
	[ 'caution', 'CAUTION' ],
] as const;

describe( 'core/quote', () => {
	describe( 'markdown-to-blocks', () => {
		it( 'converts a simple block quote', () => {
			const blocks = markdownToBlocks( markdown( '> hello' ) );
			expect( blocks ).toHaveLength( 1 );
			expect( blocks[ 0 ].innerBlocks ).toHaveLength( 1 );
			expect( blocks[ 0 ] ).toMatchObject( {
				name: 'core/quote',
				attributes: {},
				innerBlocks: [
					{
						name: 'core/paragraph',
						attributes: { content: 'hello' },
					},
				],
			} );
		} );

		it( 'converts a multi-paragraph block quote', () => {
			const blocks = markdownToBlocks(
				markdown(
					// prettier-ignore
					'> one',
					'>',
					'> two'
				)
			);
			expect( blocks[ 0 ].innerBlocks ).toHaveLength( 2 );
			expect( blocks[ 0 ] ).toMatchObject( {
				name: 'core/quote',
				innerBlocks: [
					{
						name: 'core/paragraph',
						attributes: { content: 'one' },
					},
					{
						name: 'core/paragraph',
						attributes: { content: 'two' },
					},
				],
			} );
		} );

		it( 'converts a block quote containing a heading and a list', () => {
			const blocks = markdownToBlocks(
				markdown(
					// prettier-ignore
					'> # title',
					'>',
					'> - one',
					'> - two'
				)
			);
			expect( blocks[ 0 ].innerBlocks ).toHaveLength( 2 );
			expect( blocks[ 0 ].innerBlocks[ 1 ].innerBlocks ).toHaveLength(
				2
			);
			expect( blocks[ 0 ] ).toMatchObject( {
				name: 'core/quote',
				innerBlocks: [
					{
						name: 'core/heading',
						attributes: { content: 'title', level: 1 },
					},
					{
						name: 'core/list',
						attributes: { ordered: false },
						innerBlocks: [
							{
								name: 'core/list-item',
								attributes: { content: 'one' },
							},
							{
								name: 'core/list-item',
								attributes: { content: 'two' },
							},
						],
					},
				],
			} );
		} );

		it( 'converts a nested block quote', () => {
			const blocks = markdownToBlocks(
				markdown(
					// prettier-ignore
					'> outer',
					'>',
					'> > inner'
				)
			);
			expect( blocks[ 0 ].innerBlocks ).toHaveLength( 2 );
			expect( blocks[ 0 ] ).toMatchObject( {
				name: 'core/quote',
				innerBlocks: [
					{
						name: 'core/paragraph',
						attributes: { content: 'outer' },
					},
					{
						name: 'core/quote',
						innerBlocks: [
							{
								name: 'core/paragraph',
								attributes: { content: 'inner' },
							},
						],
					},
				],
			} );
		} );

		it.each( ALERT_TYPES )( 'converts a [!%s] alert', ( type, keyword ) => {
			const blocks = markdownToBlocks(
				markdown(
					// prettier-ignore
					`> [!${ keyword }]`,
					'> Body text.'
				)
			);
			expect( blocks ).toHaveLength( 1 );
			expect( blocks[ 0 ] ).toMatchObject( {
				name: 'core/quote',
				attributes: { markdownData: { alertType: type } },
				innerBlocks: [
					{
						name: 'core/paragraph',
						attributes: { content: 'Body text.' },
					},
				],
			} );
		} );

		it( 'matches the alert marker case-insensitively', () => {
			const blocks = markdownToBlocks(
				markdown(
					// prettier-ignore
					'> [!note]',
					'> Body text.'
				)
			);
			expect( blocks[ 0 ] ).toMatchObject( {
				name: 'core/quote',
				attributes: { markdownData: { alertType: 'note' } },
			} );
		} );

		it( 'treats a plain block quote as a non-alert', () => {
			const blocks = markdownToBlocks( markdown( '> hello' ) );
			expect( blocks[ 0 ].name ).toBe( 'core/quote' );
			expect( blocks[ 0 ].attributes.markdownData ).toBeUndefined();
		} );

		it( 'does not treat trailing text on the marker line as an alert', () => {
			const blocks = markdownToBlocks(
				markdown( '> [!NOTE] still text' )
			);
			expect( blocks[ 0 ].name ).toBe( 'core/quote' );
			expect( blocks[ 0 ].attributes.markdownData ).toBeUndefined();
			expect( blocks[ 0 ].innerBlocks[ 0 ] ).toMatchObject( {
				name: 'core/paragraph',
				attributes: { content: '[!NOTE] still text' },
			} );
		} );
	} );

	describe( 'blocks-to-markdown', () => {
		it( 'converts a simple block quote', () => {
			expect(
				blocksToMarkdown( [ quote( [ paragraph( 'hello' ) ] ) ] )
			).toBe( markdown( '> hello' ) );
		} );

		it( 'converts a multi-paragraph block quote', () => {
			expect(
				blocksToMarkdown( [
					quote( [ paragraph( 'one' ), paragraph( 'two' ) ] ),
				] )
			).toBe(
				markdown(
					// prettier-ignore
					'> one',
					'>',
					'> two'
				)
			);
		} );

		it( 'converts a nested block quote', () => {
			expect(
				blocksToMarkdown( [
					quote( [
						paragraph( 'outer' ),
						quote( [ paragraph( 'inner' ) ] ),
					] ),
				] )
			).toBe(
				markdown(
					// prettier-ignore
					'> outer',
					'>',
					'> > inner'
				)
			);
		} );

		it( 'emits a bare marker for an empty block quote', () => {
			expect( blocksToMarkdown( [ quote( [] ) ] ) ).toBe(
				markdown( '>' )
			);
		} );

		it.each( ALERT_TYPES )( 'converts a [!%s] alert', ( type, keyword ) => {
			expect(
				blocksToMarkdown( [
					alert( type, [ paragraph( 'Body text.' ) ] ),
				] )
			).toBe(
				markdown(
					// prettier-ignore
					`> [!${ keyword }]`,
					'> Body text.'
				)
			);
		} );

		it( 'emits a bare marker for an empty alert', () => {
			expect( blocksToMarkdown( [ alert( 'note', [] ) ] ) ).toBe(
				markdown( '> [!NOTE]' )
			);
		} );
	} );

	describe( 'roundtrip', () => {
		it( 'preserves a simple block quote', () => {
			const md = markdown( '> hello' );
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'preserves a multi-paragraph block quote', () => {
			const md = markdown(
				// prettier-ignore
				'> one',
				'>',
				'> two'
			);
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'preserves a block quote containing a list', () => {
			const md = markdown(
				// prettier-ignore
				'> - one',
				'> - two'
			);
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'preserves a nested block quote', () => {
			const md = markdown(
				// prettier-ignore
				'> outer',
				'>',
				'> > inner'
			);
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it.each( ALERT_TYPES )(
			'preserves a [!%s] alert',
			( _type, keyword ) => {
				const md = markdown(
					// prettier-ignore
					`> [!${ keyword }]`,
					'> Body text.'
				);
				expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
			}
		);

		it( 'preserves a multi-paragraph alert', () => {
			const md = markdown(
				// prettier-ignore
				'> [!WARNING]',
				'> First.',
				'>',
				'> Second.'
			);
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'preserves an alert whose body opens with a list', () => {
			const md = markdown(
				// prettier-ignore
				'> [!TIP]',
				'>',
				'> - one',
				'> - two'
			);
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );
	} );
} );
