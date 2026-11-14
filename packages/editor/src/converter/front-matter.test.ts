/**
 * External dependencies
 */
import { describe, it, expect } from 'vitest';

/**
 * Internal dependencies
 */
import {
	blocksToMarkdown,
	getFrontMatterBlockValue,
	getFrontMatterValue,
	isFrontMatterBlockValueEditable,
	isMarpDocument,
	isMarpFrontMatter,
	joinFrontMatter,
	markdownToBlocks,
	setFrontMatterBlockValue,
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
		[ 'a value with a hash', 'theme: a#b', 'a#b' ],
		[ 'a quoted value with a hash', 'theme: "a # b" # c', 'a # b' ],
		[ 'an escaped quote', 'theme: "say \\"hi\\""', 'say "hi"' ],
		[ 'a single-quoted quote', "theme: 'it''s'", "it's" ],
		[ 'a value with a colon', 'theme: 16:9', '16:9' ],
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
	it.each( [ 'Hello', 'a: b', 'a #b', ' a ', '"quoted"', "it's", '#tag' ] )(
		'reads back %j unchanged',
		( text ) => {
			expect(
				getFrontMatterValue(
					setFrontMatterValue( 'marp: true', 'footer', text ),
					'footer'
				)
			).toBe( text );
		}
	);

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
			'keeps the comment of a quoted value',
			'theme: "a # b" # c',
			'd',
			'theme: d # c',
		],
		[
			'quotes a value with a colon and space',
			'',
			'a: b',
			'theme: "a: b"',
		],
		[ 'quotes a value with a comment marker', '', 'a #b', 'theme: "a #b"' ],
		[ 'quotes surrounding spaces', '', 'a ', 'theme: "a "' ],
		[ 'quotes a leading quote', '', '"a"', 'theme: "\\"a\\""' ],
		[ 'keeps a colon without a space plain', '', '16:9', 'theme: 16:9' ],
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

describe( 'getFrontMatterBlockValue', () => {
	it( 'reads a block scalar without its indentation', () => {
		expect(
			getFrontMatterBlockValue(
				'marp: true\nstyle: |\n  section {\n    color: red;\n  }\n\n  h1 {}\npaginate: true',
				'style'
			)
		).toBe( 'section {\n  color: red;\n}\n\nh1 {}' );
	} );

	it( 'reads a one-line value', () => {
		expect(
			getFrontMatterBlockValue( 'style: "h1 { color: red; }"', 'style' )
		).toBe( 'h1 { color: red; }' );
	} );

	it( 'folds a folded block scalar like YAML', () => {
		expect(
			getFrontMatterBlockValue(
				'style: >\n  section::after { content: "hello\n  world"; }\n\n  h1 {\n    color: red;\n  }',
				'style'
			)
		).toBe(
			'section::after { content: "hello world"; }\nh1 {\n  color: red;\n}'
		);
	} );

	it( 'reads a value starting after a comment', () => {
		expect(
			getFrontMatterBlockValue(
				'style: # custom CSS\n  "section { color: red; }"',
				'style'
			)
		).toBe( 'section { color: red; }' );
	} );

	it( 'reads a quoted value starting on the next line', () => {
		expect(
			getFrontMatterBlockValue(
				'style:\n  "section { color: red; }"',
				'style'
			)
		).toBe( 'section { color: red; }' );
	} );

	it( 'reads a quoted value spanning several lines', () => {
		expect(
			getFrontMatterBlockValue(
				'style: "section {\n  color: red;\n  }"\npaginate: true',
				'style'
			)
		).toBe( 'section { color: red; }' );
	} );

	it( 'reads a quoted key and YAML escapes', () => {
		expect(
			getFrontMatterBlockValue(
				'"style": "section {\\x20color: red; }"',
				'style'
			)
		).toBe( 'section { color: red; }' );
	} );

	it( 'returns null when the key is missing', () => {
		expect( getFrontMatterBlockValue( 'marp: true', 'style' ) ).toBeNull();
	} );
} );

describe( 'setFrontMatterBlockValue', () => {
	it( 'adds a new key before a document-end marker', () => {
		expect(
			setFrontMatterBlockValue( 'marp: true\n...', 'style', 'h1 {}' )
		).toBe( 'marp: true\nstyle: |\n  h1 {}\n...' );
	} );

	it( 'leaves a value with an anchored key as it is', () => {
		const frontMatter = '&k style: "h1 {}"\nheader: *k';
		expect( isFrontMatterBlockValueEditable( frontMatter, 'style' ) ).toBe(
			false
		);
	} );

	it( 'leaves an anchored empty value as it is', () => {
		const frontMatter = 'style: &empty\nheader: *empty';
		expect( isFrontMatterBlockValueEditable( frontMatter, 'style' ) ).toBe(
			false
		);
		expect(
			setFrontMatterBlockValue( frontMatter, 'style', 'h1 {}' )
		).toBe( frontMatter );
	} );

	it( 'keeps leading spaces with an indentation indicator', () => {
		const value = '  h1 {\n  color: red;\n}';
		const result = setFrontMatterBlockValue( 'marp: true', 'style', value );
		expect( result ).toBe(
			'marp: true\nstyle: |2\n    h1 {\n    color: red;\n  }'
		);
		expect( getFrontMatterBlockValue( result, 'style' ) ).toBe( value );
	} );

	it( 'replaces a block scalar in place', () => {
		expect(
			setFrontMatterBlockValue(
				'marp: true\nstyle: |-\n  h1 {}\n\npaginate: true',
				'style',
				'h2 {}\n\nh3 {}'
			)
		).toBe( 'marp: true\nstyle: |\n  h2 {}\n\n  h3 {}\n\npaginate: true' );
	} );

	it( 'replaces a one-line value with a block scalar', () => {
		expect(
			setFrontMatterBlockValue( 'style: "h1 {}"', 'style', 'h2 {}' )
		).toBe( 'style: |\n  h2 {}' );
	} );

	it( 'replaces a quoted value spanning several lines', () => {
		expect(
			setFrontMatterBlockValue(
				'style: "section {\n  color: red;\n  }"\npaginate: true',
				'style',
				'h2 {}'
			)
		).toBe( 'style: |\n  h2 {}\npaginate: true' );
	} );

	it( 'replaces a quoted key instead of adding another', () => {
		expect(
			setFrontMatterBlockValue(
				'marp: true\n"style": |\n  h1 {}\npaginate: true',
				'style',
				'h2 {}'
			)
		).toBe( 'marp: true\nstyle: |\n  h2 {}\npaginate: true' );
	} );

	it( 'leaves front matter that is not valid YAML as it is', () => {
		const invalid = 'marp: true\nstyle: "h1 {}\npaginate: [';
		expect( isFrontMatterBlockValueEditable( invalid, 'style' ) ).toBe(
			false
		);
		expect( setFrontMatterBlockValue( invalid, 'style', 'h2 {}' ) ).toBe(
			invalid
		);
	} );

	it( 'adds the key at the end', () => {
		expect(
			setFrontMatterBlockValue( 'marp: true', 'style', 'h1 {}' )
		).toBe( 'marp: true\nstyle: |\n  h1 {}' );
	} );

	it( 'removes the key', () => {
		expect(
			setFrontMatterBlockValue(
				'marp: true\nstyle: |\n  h1 {}\npaginate: true',
				'style',
				null
			)
		).toBe( 'marp: true\npaginate: true' );
	} );
} );

describe( 'isFrontMatterBlockValueEditable', () => {
	it( 'rejects anchors, tags, aliases and collections', () => {
		for ( const frontMatter of [
			'style: &css |\n  h1 {}',
			'style: !!str h1 {}',
			'style: *css',
			'style: [ a ]',
			'style: # note\n  &css "h1 {}"',
		] ) {
			expect(
				isFrontMatterBlockValueEditable( frontMatter, 'style' )
			).toBe( false );
			expect(
				setFrontMatterBlockValue( frontMatter, 'style', 'h2 {}' )
			).toBe( frontMatter );
		}
	} );

	it( 'accepts strings and a missing key', () => {
		expect(
			isFrontMatterBlockValueEditable( 'style: |\n  h1 {}', 'style' )
		).toBe( true );
		expect(
			isFrontMatterBlockValueEditable( 'style: "h1 {}"', 'style' )
		).toBe( true );
		expect( isFrontMatterBlockValueEditable( 'marp: true', 'style' ) ).toBe(
			true
		);
	} );
} );
