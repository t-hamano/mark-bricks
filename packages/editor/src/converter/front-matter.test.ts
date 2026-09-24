/**
 * External dependencies
 */
import { describe, it, expect } from 'vitest';
import * as fixtures from '@mark-bricks/fixtures';

/**
 * Internal dependencies
 */
import {
	blocksToMarkdown,
	joinFrontMatter,
	markdownToBlocks,
	splitFrontMatter,
} from '.';

// Mirrors how the editor loads and saves a document.
function roundTrip( markdown: string ): string {
	const { frontMatter, body } = splitFrontMatter( markdown );
	return joinFrontMatter(
		frontMatter,
		blocksToMarkdown( markdownToBlocks( body ) )
	);
}

describe( 'splitFrontMatter', () => {
	it( 'splits front matter off the body', () => {
		expect(
			splitFrontMatter( '---\ntitle: Hello\ntags: [a, b]\n---\n\n# Hi\n' )
		).toEqual( {
			frontMatter: 'title: Hello\ntags: [a, b]',
			body: '\n# Hi\n',
		} );
	} );

	it( 'returns null front matter when there is none', () => {
		expect( splitFrontMatter( '# Hi\n' ) ).toEqual( {
			frontMatter: null,
			body: '# Hi\n',
		} );
	} );

	it( 'recognizes an empty front matter block', () => {
		expect( splitFrontMatter( '---\n---\n# Hi\n' ) ).toEqual( {
			frontMatter: '',
			body: '# Hi\n',
		} );
	} );

	it( 'recognizes front matter without a body', () => {
		expect( splitFrontMatter( '---\ntitle: Hello\n---' ) ).toEqual( {
			frontMatter: 'title: Hello',
			body: '',
		} );
	} );

	it( 'recognizes front matter after a UTF-8 BOM', () => {
		expect(
			splitFrontMatter( '\uFEFF---\ntitle: Hello\n---\n# Hi\n' )
		).toEqual( {
			frontMatter: 'title: Hello',
			body: '# Hi\n',
		} );
	} );

	it( 'normalizes CRLF line endings in the front matter', () => {
		expect(
			splitFrontMatter( '---\r\ntitle: Hello\r\ndraft: true\r\n---\r\n' )
		).toEqual( {
			frontMatter: 'title: Hello\ndraft: true',
			body: '',
		} );
	} );

	it( 'ignores a fence that does not start the document', () => {
		const markdown = '\n---\ntitle: Hello\n---\n';
		expect( splitFrontMatter( markdown ) ).toEqual( {
			frontMatter: null,
			body: markdown,
		} );
	} );

	it( 'ignores an opening fence that is never closed', () => {
		const markdown = '---\n\nParagraph\n';
		expect( splitFrontMatter( markdown ) ).toEqual( {
			frontMatter: null,
			body: markdown,
		} );
	} );

	it( 'stops at the first closing fence', () => {
		expect( splitFrontMatter( '---\na: 1\n---\n\nText\n\n---\n' ) ).toEqual(
			{
				frontMatter: 'a: 1',
				body: '\nText\n\n---\n',
			}
		);
	} );
} );

describe( 'joinFrontMatter', () => {
	it( 'returns the body as is without front matter', () => {
		expect( joinFrontMatter( null, '# Hi\n' ) ).toBe( '# Hi\n' );
	} );

	it( 'separates the front matter from the body with a blank line', () => {
		expect( joinFrontMatter( 'title: Hello', '# Hi\n' ) ).toBe(
			'---\ntitle: Hello\n---\n\n# Hi\n'
		);
	} );

	it( 'writes an empty front matter block', () => {
		expect( joinFrontMatter( '', '' ) ).toBe( '---\n---\n' );
		expect( joinFrontMatter( '', '# Hi\n' ) ).toBe( '---\n---\n\n# Hi\n' );
	} );

	it( 'is the inverse of splitFrontMatter', () => {
		for ( const frontMatter of [
			'',
			'a: 1',
			'a: 1\n',
			'\n',
			'a:\n  - b',
		] ) {
			const markdown = joinFrontMatter( frontMatter, '# Hi\n' );
			expect( splitFrontMatter( markdown ) ).toEqual( {
				frontMatter,
				body: '\n# Hi\n',
			} );
		}
	} );
} );

describe( 'front matter round-trip', () => {
	it.each( [
		[ 'front matter and body', '---\ntitle: Hello\n---\n\n# Hi\n' ],
		[ 'front matter only', '---\ntitle: Hello\n---\n' ],
		[ 'empty front matter', '---\n---\n\nParagraph\n' ],
		[
			'nested YAML',
			'---\ntitle: "Hello: world"\ntags:\n  - a\n  - b\nauthor:\n  name: Aki\n---\n\nParagraph\n',
		],
		[
			'a body that contains thematic breaks',
			'---\na: 1\n---\n\nText\n\n---\n\nMore text\n',
		],
		[ 'no front matter', '# Hi\n\n---\n\nText\n' ],
	] )( 'round-trips %s without loss', ( _name, markdown ) => {
		expect( roundTrip( markdown ) ).toBe( markdown );
	} );

	it.each( Object.entries( fixtures ) )(
		'round-trips the %s fixture with front matter prepended',
		( _name, markdown ) => {
			const withFrontMatter = joinFrontMatter(
				'title: Fixture\ndraft: false',
				markdown
			);
			expect( roundTrip( withFrontMatter ) ).toBe( withFrontMatter );
		}
	);

	it( 'keeps the front matter out of the blocks', () => {
		const { body } = splitFrontMatter( '---\ntitle: Hello\n---\n\nText\n' );
		const blocks = markdownToBlocks( body );
		expect( blocks.map( ( block ) => block.name ) ).toEqual( [
			'core/paragraph',
		] );
	} );
} );
