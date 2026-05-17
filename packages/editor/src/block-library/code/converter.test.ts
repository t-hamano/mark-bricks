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

function codeBlock( attributes: Block[ 'attributes' ] ): Block {
	return {
		name: 'core/code',
		clientId: 'test-id',
		attributes,
		innerBlocks: [],
		isValid: true,
	};
}

describe( 'core/code', () => {
	describe( 'markdown-to-blocks', () => {
		it( 'converts a fenced code block', () => {
			expect( markdownToBlocks( '```\nhello\n```' ) ).toEqual( [
				{
					name: 'core/code',
					clientId: expect.any( String ),
					attributes: {
						content: 'hello',
						markdownData: { format: 'fenced-backtick' },
					},
					innerBlocks: [],
					isValid: true,
				},
			] );
		} );

		it( 'preserves the language as markdownData.language', () => {
			const blocks = markdownToBlocks( '```js\nconst x = 1;\n```' );
			expect( blocks[ 0 ].name ).toBe( 'core/code' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				content: 'const x = 1;',
				markdownData: { format: 'fenced-backtick', language: 'js' },
			} );
		} );

		it( 'preserves multi-line code content', () => {
			const blocks = markdownToBlocks( '```\nline1\nline2\n```' );
			expect( blocks[ 0 ].name ).toBe( 'core/code' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				content: 'line1\nline2',
				markdownData: { format: 'fenced-backtick' },
			} );
		} );

		it( 'detects an indented code block', () => {
			const blocks = markdownToBlocks( '    line1\n    line2' );
			expect( blocks ).toHaveLength( 1 );
			expect( blocks[ 0 ].name ).toBe( 'core/code' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				content: 'line1\nline2',
				markdownData: { format: 'indented' },
			} );
		} );

		it( 'detects a tilde-fenced code block', () => {
			const blocks = markdownToBlocks( '~~~\nhello\n~~~' );
			expect( blocks[ 0 ].name ).toBe( 'core/code' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				content: 'hello',
				markdownData: { format: 'fenced-tilde' },
			} );
		} );

		it( 'detects a tilde-fenced code block with language', () => {
			const blocks = markdownToBlocks( '~~~js\nconst x = 1;\n~~~' );
			expect( blocks[ 0 ].name ).toBe( 'core/code' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				content: 'const x = 1;',
				markdownData: {
					format: 'fenced-tilde',
					language: 'js',
				},
			} );
		} );
	} );

	describe( 'blocks-to-markdown', () => {
		it( 'converts a code block to fenced markdown', () => {
			expect(
				blocksToMarkdown( [ codeBlock( { content: 'hello' } ) ] )
			).toBe( '```\nhello\n```\n' );
		} );

		it( 'preserves multi-line code content', () => {
			expect(
				blocksToMarkdown( [ codeBlock( { content: 'line1\nline2' } ) ] )
			).toBe( '```\nline1\nline2\n```\n' );
		} );

		it( 'does not escape markdown characters inside code', () => {
			expect(
				blocksToMarkdown( [ codeBlock( { content: '*not italic*' } ) ] )
			).toBe( '```\n*not italic*\n```\n' );
		} );

		it( 'emits the language info-string from markdownData', () => {
			expect(
				blocksToMarkdown( [
					codeBlock( {
						content: 'const x = 1;',
						markdownData: { language: 'js' },
					} ),
				] )
			).toBe( '```js\nconst x = 1;\n```\n' );
		} );

		it( 'outputs a tilde fence when markdownData.format is fenced-tilde', () => {
			expect(
				blocksToMarkdown( [
					codeBlock( {
						content: 'hello',
						markdownData: { format: 'fenced-tilde' },
					} ),
				] )
			).toBe( '~~~\nhello\n~~~\n' );
		} );

		it( 'outputs an empty fence for an empty code block', () => {
			expect( blocksToMarkdown( [ codeBlock( { content: '' } ) ] ) ).toBe(
				'```\n```\n'
			);
		} );

		it( 'extends the fence when content contains backticks', () => {
			expect(
				blocksToMarkdown( [ codeBlock( { content: 'a ``` b' } ) ] )
			).toBe( '````\na ``` b\n````\n' );
		} );
	} );

	describe( 'roundtrip', () => {
		it( 'preserves the language info-string', () => {
			const md = '```js\nconst x = 1;\n```\n';
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'preserves the tilde fence format', () => {
			const md = '~~~\nhello\n~~~\n';
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'indented format falls back to fenced-backtick output (known limitation)', () => {
			expect(
				blocksToMarkdown( markdownToBlocks( '    hello\n' ) )
			).toBe( '```\nhello\n```\n' );
		} );
	} );
} );
