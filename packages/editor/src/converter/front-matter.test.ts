/**
 * External dependencies
 */
import { describe, it, expect } from 'vitest';

/**
 * Internal dependencies
 */
import {
	blocksToMarkdown,
	getFrontMatterValue,
	isMarpDocument,
	isMarpFrontMatter,
	joinFrontMatter,
	markdownToBlocks,
	setFrontMatterValue,
	setMarpFrontMatter,
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

	it( 'keeps the front matter out of the blocks', () => {
		const { body } = splitFrontMatter( '---\ntitle: Hello\n---\n\nText\n' );
		const blocks = markdownToBlocks( body );
		expect( blocks.map( ( block ) => block.name ) ).toEqual( [
			'core/paragraph',
		] );
	} );
} );

describe( 'isMarpFrontMatter', () => {
	it.each( [
		[ 'is the only key', 'marp: true' ],
		[ 'is among other keys', 'theme: gaia\nmarp: true\npaginate: true' ],
		[ 'has a comment', 'marp: true # slides' ],
	] )( 'detects `marp: true` that %s', ( _name, frontMatter ) => {
		expect( isMarpFrontMatter( frontMatter ) ).toBe( true );
	} );

	it.each( [
		[ 'is missing', null ],
		[ 'is empty', '' ],
		[ 'sets marp to false', 'marp: false' ],
		[ 'nests marp under another key', 'slides:\n  marp: true' ],
		[ 'has no space after the colon', 'marp:true' ],
	] )( 'does not detect front matter that %s', ( _name, frontMatter ) => {
		expect( isMarpFrontMatter( frontMatter ) ).toBe( false );
	} );
} );

describe( 'setMarpFrontMatter', () => {
	it.each( [
		[ 'is empty', '', 'marp: true' ],
		[ 'has other keys', 'title: Hi', 'marp: true\ntitle: Hi' ],
		[
			'sets marp to false',
			'title: Hi\nmarp: false',
			'marp: true\ntitle: Hi',
		],
		[
			'already enables marp',
			'title: Hi\nmarp: true',
			'title: Hi\nmarp: true',
		],
	] )(
		'turns Marp on in front matter that %s',
		( _name, input, expected ) => {
			expect( setMarpFrontMatter( input, true ) ).toBe( expected );
		}
	);

	it.each( [
		[ 'is the only key', 'marp: true', '' ],
		[
			'is among other keys',
			'theme: gaia\nmarp: true\npaginate: true',
			'theme: gaia\npaginate: true',
		],
		[ 'has a comment', 'marp: true # slides\ntitle: Hi', 'title: Hi' ],
		[ 'sets marp to false', 'marp: false\ntitle: Hi', 'title: Hi' ],
		[
			'nests marp under another key',
			'slides:\n  marp: true',
			'slides:\n  marp: true',
		],
	] )(
		'turns Marp off in front matter that %s',
		( _name, input, expected ) => {
			expect( setMarpFrontMatter( input, false ) ).toBe( expected );
		}
	);
} );

describe( 'getFrontMatterValue', () => {
	it.each( [
		[ 'a plain value', 'marp: true\ntheme: gaia', 'gaia' ],
		[ 'a quoted value', 'theme: "gaia"', 'gaia' ],
		[ 'a single-quoted value', "theme: 'gaia'", 'gaia' ],
		[ 'a value with a comment', 'theme: gaia # dark', 'gaia' ],
		[ 'an empty value', 'theme:', null ],
		[ 'a nested key', 'slides:\n  theme: gaia', null ],
		[ 'a missing key', 'marp: true', null ],
	] )( 'reads %s', ( _name, frontMatter, expected ) => {
		expect( getFrontMatterValue( frontMatter, 'theme' ) ).toBe( expected );
	} );

	it( 'reads nothing from missing front matter', () => {
		expect( getFrontMatterValue( null, 'theme' ) ).toBeNull();
	} );
} );

describe( 'setFrontMatterValue', () => {
	it.each( [
		[
			'replaces an existing line in place',
			'marp: true\ntheme: gaia\ntitle: Hi',
			'uncover',
			'marp: true\ntheme: uncover\ntitle: Hi',
		],
		[
			'keeps a trailing comment',
			'theme: gaia # dark',
			'uncover',
			'theme: uncover # dark',
		],
		[
			'adds a missing key after the marp line',
			'title: Hi\nmarp: true\nfoo: bar',
			'gaia',
			'title: Hi\nmarp: true\ntheme: gaia\nfoo: bar',
		],
		[
			'adds a missing key at the end without a marp line',
			'title: Hi',
			'gaia',
			'title: Hi\ntheme: gaia',
		],
		[ 'adds a key to empty front matter', '', 'gaia', 'theme: gaia' ],
		[
			'removes duplicate keys',
			'theme: gaia\ntheme: default',
			'uncover',
			'theme: uncover',
		],
		[
			'removes the key',
			'marp: true\ntheme: gaia\ntitle: Hi',
			null,
			'marp: true\ntitle: Hi',
		],
	] )( '%s', ( _name, frontMatter, value, expected ) => {
		expect( setFrontMatterValue( frontMatter, 'theme', value ) ).toBe(
			expected
		);
	} );
} );

describe( 'isMarpDocument', () => {
	it.each( [
		[ 'is the only key', '---\nmarp: true\n---\n' ],
		[ 'is among other keys', '---\ntheme: gaia\nmarp: true\n---\n# A' ],
		[ 'has a comment', '---\nmarp: true # slides\n---\n' ],
		[ 'has CRLF line endings', '---\r\nmarp: true\r\n---\r\n' ],
		[ 'follows a BOM', '\uFEFF---\nmarp: true\n---\n' ],
	] )( 'detects `marp: true` that %s', ( _name, markdown ) => {
		expect( isMarpDocument( markdown ) ).toBe( true );
	} );

	it.each( [
		[ 'has no front matter', '# marp: true\n' ],
		[ 'has empty front matter', '---\n---\n' ],
		[ 'sets marp to false', '---\nmarp: false\n---\n' ],
		[ 'nests marp under another key', '---\nslides:\n  marp: true\n---\n' ],
		[ 'has no space after the colon', '---\nmarp:true\n---\n' ],
		[
			'has marp: true only in the body',
			'---\ntitle: A\n---\n\nmarp: true\n',
		],
	] )( 'does not detect a document that %s', ( _name, markdown ) => {
		expect( isMarpDocument( markdown ) ).toBe( false );
	} );
} );
