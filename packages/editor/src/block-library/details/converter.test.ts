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

function details(
	attributes: Block[ 'attributes' ],
	innerBlocks: Block[] = []
): Block {
	return {
		name: 'core/details',
		clientId: 'test-id',
		attributes,
		innerBlocks,
		isValid: true,
	};
}

describe( 'core/details', () => {
	describe( 'markdown-to-blocks', () => {
		it( 'converts a details element', () => {
			const blocks = markdownToBlocks(
				markdown(
					// prettier-ignore
					'<details>',
					'<summary>More information</summary>',
					'',
					'Hidden body.',
					'',
					'</details>'
				)
			);
			expect( blocks ).toHaveLength( 1 );
			expect( blocks[ 0 ] ).toMatchObject( {
				name: 'core/details',
				attributes: { summary: 'More information' },
				innerBlocks: [
					{
						name: 'core/paragraph',
						attributes: { content: 'Hidden body.' },
					},
				],
			} );
			expect( blocks[ 0 ].attributes.showContent ).toBeUndefined();
		} );

		it( 'converts the open attribute', () => {
			const blocks = markdownToBlocks(
				markdown(
					// prettier-ignore
					'<details open>',
					'<summary>Summary</summary>',
					'',
					'Body.',
					'',
					'</details>'
				)
			);
			expect( blocks[ 0 ] ).toMatchObject( {
				name: 'core/details',
				attributes: { summary: 'Summary', showContent: true },
			} );
		} );

		it( 'converts an element without a summary', () => {
			const blocks = markdownToBlocks(
				markdown(
					// prettier-ignore
					'<details>',
					'',
					'Body.',
					'',
					'</details>'
				)
			);
			expect( blocks[ 0 ].name ).toBe( 'core/details' );
			expect( blocks[ 0 ].attributes.summary ).toBeUndefined();
			expect( blocks[ 0 ].innerBlocks ).toHaveLength( 1 );
		} );

		it( 'converts an element without a body', () => {
			const blocks = markdownToBlocks(
				markdown(
					// prettier-ignore
					'<details>',
					'<summary>Summary</summary>',
					'</details>'
				)
			);
			expect( blocks ).toHaveLength( 1 );
			expect( blocks[ 0 ] ).toMatchObject( {
				name: 'core/details',
				attributes: { summary: 'Summary' },
				innerBlocks: [],
			} );
		} );

		it( 'keeps the summary formatting as inline HTML', () => {
			const blocks = markdownToBlocks(
				markdown(
					// prettier-ignore
					'<details>',
					'<summary>A <strong>bold</strong> summary</summary>',
					'</details>'
				)
			);
			expect( blocks[ 0 ].attributes.summary ).toBe(
				'A <strong>bold</strong> summary'
			);
		} );

		it( 'parses the body as markdown', () => {
			const blocks = markdownToBlocks(
				markdown(
					// prettier-ignore
					'<details>',
					'<summary>Summary</summary>',
					'',
					'## Heading',
					'',
					'- one',
					'- two',
					'',
					'</details>'
				)
			);
			expect( blocks[ 0 ].innerBlocks ).toMatchObject( [
				{ name: 'core/heading', attributes: { level: 2 } },
				{ name: 'core/list' },
			] );
		} );

		it( 'converts a body written without blank lines', () => {
			const blocks = markdownToBlocks(
				markdown( '<details><summary>Summary</summary>Body.</details>' )
			);
			expect( blocks ).toHaveLength( 1 );
			expect( blocks[ 0 ] ).toMatchObject( {
				name: 'core/details',
				attributes: { summary: 'Summary' },
				innerBlocks: [
					{
						name: 'core/paragraph',
						attributes: { content: 'Body.' },
					},
				],
			} );
		} );

		it( 'converts a nested details element', () => {
			const blocks = markdownToBlocks(
				markdown(
					// prettier-ignore
					'<details>',
					'<summary>Outer</summary>',
					'',
					'<details>',
					'<summary>Inner</summary>',
					'',
					'Body.',
					'',
					'</details>',
					'',
					'</details>'
				)
			);
			expect( blocks ).toHaveLength( 1 );
			expect( blocks[ 0 ] ).toMatchObject( {
				name: 'core/details',
				attributes: { summary: 'Outer' },
				innerBlocks: [
					{
						name: 'core/details',
						attributes: { summary: 'Inner' },
						innerBlocks: [
							{
								name: 'core/paragraph',
								attributes: { content: 'Body.' },
							},
						],
					},
				],
			} );
		} );

		it( 'converts a details element inside a block quote', () => {
			const blocks = markdownToBlocks(
				markdown(
					// prettier-ignore
					'> <details>',
					'> <summary>Summary</summary>',
					'>',
					'> Body.',
					'>',
					'> </details>'
				)
			);
			expect( blocks[ 0 ] ).toMatchObject( {
				name: 'core/quote',
				innerBlocks: [
					{
						name: 'core/details',
						attributes: { summary: 'Summary' },
						innerBlocks: [
							{
								name: 'core/paragraph',
								attributes: { content: 'Body.' },
							},
						],
					},
				],
			} );
		} );

		it( 'keeps an unclosed element as raw HTML', () => {
			const blocks = markdownToBlocks(
				markdown(
					// prettier-ignore
					'<details>',
					'<summary>Summary</summary>',
					'',
					'Body.'
				)
			);
			expect( blocks.map( ( block ) => block.name ) ).toEqual( [
				'core/html',
				'core/paragraph',
			] );
		} );

		it( 'keeps an element with unsupported attributes as raw HTML', () => {
			const blocks = markdownToBlocks(
				markdown(
					// prettier-ignore
					'<details class="faq">',
					'<summary>Summary</summary>',
					'',
					'Body.',
					'',
					'</details>'
				)
			);
			expect( blocks.map( ( block ) => block.name ) ).toEqual( [
				'core/html',
				'core/paragraph',
				'core/html',
			] );
		} );

		it( 'keeps markup trailing the closing tag as raw HTML', () => {
			const blocks = markdownToBlocks(
				markdown(
					// prettier-ignore
					'<details>',
					'<summary>Summary</summary>',
					'',
					'</details>',
					'<div>after</div>'
				)
			);
			expect( blocks.map( ( block ) => block.name ) ).toEqual( [
				'core/html',
				'core/html',
			] );
		} );
	} );

	describe( 'blocks-to-markdown', () => {
		it( 'converts a details block', () => {
			expect(
				blocksToMarkdown( [
					details( { summary: 'More information' }, [
						paragraph( 'Hidden body.' ),
					] ),
				] )
			).toBe(
				markdown(
					// prettier-ignore
					'<details>',
					'<summary>More information</summary>',
					'',
					'Hidden body.',
					'',
					'</details>'
				)
			);
		} );

		it( 'writes the open attribute when the block opens by default', () => {
			expect(
				blocksToMarkdown( [
					details( { summary: 'Summary', showContent: true }, [
						paragraph( 'Body.' ),
					] ),
				] )
			).toBe(
				markdown(
					// prettier-ignore
					'<details open>',
					'<summary>Summary</summary>',
					'',
					'Body.',
					'',
					'</details>'
				)
			);
		} );

		it( 'omits an empty summary', () => {
			expect(
				blocksToMarkdown( [ details( {}, [ paragraph( 'Body.' ) ] ) ] )
			).toBe(
				markdown(
					// prettier-ignore
					'<details>',
					'',
					'Body.',
					'',
					'</details>'
				)
			);
		} );

		it( 'omits an empty body', () => {
			expect(
				blocksToMarkdown( [ details( { summary: 'Summary' } ) ] )
			).toBe(
				markdown(
					// prettier-ignore
					'<details>',
					'<summary>Summary</summary>',
					'</details>'
				)
			);
		} );

		it( 'converts a nested details block', () => {
			expect(
				blocksToMarkdown( [
					details( { summary: 'Outer' }, [
						details( { summary: 'Inner' }, [
							paragraph( 'Body.' ),
						] ),
					] ),
				] )
			).toBe(
				markdown(
					// prettier-ignore
					'<details>',
					'<summary>Outer</summary>',
					'',
					'<details>',
					'<summary>Inner</summary>',
					'',
					'Body.',
					'',
					'</details>',
					'',
					'</details>'
				)
			);
		} );

		it( 'does not escape markdown characters in the summary', () => {
			expect(
				blocksToMarkdown( [
					details( { summary: 'A *starred* summary' } ),
				] )
			).toBe(
				markdown(
					// prettier-ignore
					'<details>',
					'<summary>A *starred* summary</summary>',
					'</details>'
				)
			);
		} );
	} );

	describe( 'roundtrip', () => {
		it( 'preserves a details element', () => {
			const md = markdown(
				// prettier-ignore
				'<details>',
				'<summary>More information</summary>',
				'',
				'Hidden body.',
				'',
				'</details>'
			);
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'preserves an open element', () => {
			const md = markdown(
				// prettier-ignore
				'<details open>',
				'<summary>Summary</summary>',
				'',
				'Body.',
				'',
				'</details>'
			);
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'preserves an element with a formatted summary', () => {
			const md = markdown(
				// prettier-ignore
				'<details>',
				'<summary>A <strong>bold</strong> summary</summary>',
				'',
				'Body.',
				'',
				'</details>'
			);
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'preserves an element whose body holds several blocks', () => {
			const md = markdown(
				// prettier-ignore
				'<details>',
				'<summary>Summary</summary>',
				'',
				'## Heading',
				'',
				'- one',
				'- two',
				'',
				'```js',
				'const a = 1;',
				'```',
				'',
				'</details>'
			);
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'preserves an element without a body', () => {
			const md = markdown(
				// prettier-ignore
				'<details>',
				'<summary>Summary</summary>',
				'</details>'
			);
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'preserves a nested element', () => {
			const md = markdown(
				// prettier-ignore
				'<details>',
				'<summary>Outer</summary>',
				'',
				'<details>',
				'<summary>Inner</summary>',
				'',
				'Body.',
				'',
				'</details>',
				'',
				'</details>'
			);
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'preserves an element inside a block quote', () => {
			const md = markdown(
				// prettier-ignore
				'> <details>',
				'> <summary>Summary</summary>',
				'>',
				'> Body.',
				'>',
				'> </details>'
			);
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'preserves an element with unsupported attributes as raw HTML', () => {
			const md = markdown(
				// prettier-ignore
				'<details class="faq">',
				'<summary>Summary</summary>',
				'',
				'Body.',
				'',
				'</details>'
			);
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );
	} );
} );
