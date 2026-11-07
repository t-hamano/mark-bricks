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

function mathBlock( attributes: Block[ 'attributes' ] ): Block {
	return {
		name: 'core/math',
		clientId: 'test-id',
		attributes,
		innerBlocks: [],
		isValid: true,
	};
}

describe( 'core/math', () => {
	describe( 'markdown-to-blocks', () => {
		it( 'converts a dollar math block', () => {
			expect( markdownToBlocks( '$$\nE = mc^2\n$$' ) ).toEqual( [
				{
					name: 'core/math',
					clientId: expect.any( String ),
					attributes: {
						latex: 'E = mc^2',
						markdownData: { format: 'dollar' },
					},
					innerBlocks: [],
					isValid: true,
				},
			] );
		} );

		it( 'converts a backtick math fence', () => {
			const blocks = markdownToBlocks( '```math\nE = mc^2\n```' );
			expect( blocks[ 0 ].name ).toBe( 'core/math' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				latex: 'E = mc^2',
				markdownData: { format: 'fenced-backtick' },
			} );
		} );

		it( 'converts a tilde math fence', () => {
			const blocks = markdownToBlocks( '~~~math\nE = mc^2\n~~~' );
			expect( blocks[ 0 ].name ).toBe( 'core/math' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				latex: 'E = mc^2',
				markdownData: { format: 'fenced-tilde' },
			} );
		} );

		it( 'keeps the text after the opening fence as markdownData.meta', () => {
			const blocks = markdownToBlocks( '$$ {#eq}\na\n$$' );
			expect( blocks[ 0 ].attributes ).toEqual( {
				latex: 'a',
				markdownData: { format: 'dollar', meta: '{#eq}' },
			} );
		} );

		it( 'leaves a fence whose language is not exactly math as a code block', () => {
			const blocks = markdownToBlocks( '```Math\na\n```' );
			expect( blocks[ 0 ].name ).toBe( 'core/code' );
		} );

		it( 'lets a dollar math block interrupt a paragraph', () => {
			const blocks = markdownToBlocks( 'text\n$$\na\n$$' );
			expect( blocks.map( ( block ) => block.name ) ).toEqual( [
				'core/paragraph',
				'core/math',
			] );
		} );
	} );

	describe( 'blocks-to-markdown', () => {
		it( 'outputs a dollar math block', () => {
			expect(
				blocksToMarkdown( [
					mathBlock( {
						latex: 'E = mc^2',
						markdownData: { format: 'dollar' },
					} ),
				] )
			).toBe( '$$\nE = mc^2\n$$\n' );
		} );

		it( 'outputs a dollar math block when markdownData is missing', () => {
			expect(
				blocksToMarkdown( [ mathBlock( { latex: 'E = mc^2' } ) ] )
			).toBe( '$$\nE = mc^2\n$$\n' );
		} );

		it( 'outputs a tilde fence when markdownData.format is fenced-tilde', () => {
			expect(
				blocksToMarkdown( [
					mathBlock( {
						latex: 'E = mc^2',
						markdownData: { format: 'fenced-tilde' },
					} ),
				] )
			).toBe( '~~~math\nE = mc^2\n~~~\n' );
		} );

		it( 'lengthens the fence when the math contains dollar signs', () => {
			expect(
				blocksToMarkdown( [
					mathBlock( {
						latex: 'a\n$$\nb',
						markdownData: { format: 'dollar' },
					} ),
				] )
			).toBe( '$$$\na\n$$\nb\n$$$\n' );
		} );
	} );

	describe( 'roundtrip', () => {
		it( 'preserves a dollar math block', () => {
			const md = '$$\nx_1 * y_2 \\cdot z\n$$\n';
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'preserves a backtick math fence', () => {
			const md = '```math\nE = mc^2\n```\n';
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'preserves the text after the opening fence', () => {
			const md = '$$ {#eq}\na\n$$\n\n```math {#eq}\nb\n```\n';
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'preserves a dollar math block inside a quote and a list', () => {
			const md = '> $$\n> a\n> $$\n\n- item\n  $$\n  b\n  $$\n';
			expect( blocksToMarkdown( markdownToBlocks( md ) ) ).toBe( md );
		} );

		it( 'leaves dollar signs inside a paragraph as text', () => {
			const md = 'Price $5 and $$E=mc^2$$\n\n$$E=mc^2$$ at the start\n';
			const blocks = markdownToBlocks( md );
			expect( blocks.map( ( block ) => block.name ) ).toEqual( [
				'core/paragraph',
				'core/paragraph',
			] );
			expect( blocksToMarkdown( blocks ) ).toBe( md );
		} );

		it( 'keeps an escaped $$ line in a paragraph from opening a math block', () => {
			const md = 'a\n\\$$\nb\n';
			const blocks = markdownToBlocks( md );
			expect( blocks.map( ( block ) => block.name ) ).toEqual( [
				'core/paragraph',
			] );
			expect( blocksToMarkdown( blocks ) ).toBe( md );
		} );
	} );
} );
