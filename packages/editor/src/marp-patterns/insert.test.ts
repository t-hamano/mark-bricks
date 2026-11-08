/**
 * External dependencies
 */
import { describe, it, expect } from 'vitest';

/**
 * Internal dependencies
 */
import { blocksToMarkdown, markdownToBlocks } from '../converter';
import { getSlidePatternBlocks } from './insert';
import type { SlidePattern } from './types';

const pattern: SlidePattern = {
	name: 'test',
	title: () => 'Test',
	markdown: '# {{heading}}',
	strings: () => ( { heading: 'Heading' } ),
};

const [ paragraph ] = markdownToBlocks( 'Text' );
const [ separator ] = markdownToBlocks( '---' );

function insert(
	before: typeof paragraph | undefined,
	after: typeof paragraph | undefined
) {
	return blocksToMarkdown( getSlidePatternBlocks( pattern, before, after ) );
}

describe( 'getSlidePatternBlocks', () => {
	it( 'adds no separator in an empty document', () => {
		expect( insert( undefined, undefined ) ).toBe( '# Heading\n' );
	} );

	it( 'starts a new slide after other content', () => {
		expect( insert( paragraph, undefined ) ).toBe( '---\n\n# Heading\n' );
	} );

	it( 'ends its slide before other content', () => {
		expect( insert( undefined, paragraph ) ).toBe( '# Heading\n\n---\n' );
	} );

	it( 'separates itself on both sides in the middle of a slide', () => {
		expect( insert( paragraph, paragraph ) ).toBe(
			'---\n\n# Heading\n\n---\n'
		);
	} );

	it( 'reuses the separators around it', () => {
		expect( insert( separator, separator ) ).toBe( '# Heading\n' );
	} );
} );
