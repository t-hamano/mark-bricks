/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import { normalizeAiFrontMatter, splitAiFrontMatter } from './front-matter';

describe( 'splitAiFrontMatter', () => {
	it( 'splits well-formed front matter', () => {
		expect(
			splitAiFrontMatter(
				'---\nmarp: true\ntheme: default\n---\n\n# Title\n'
			)
		).toEqual( {
			frontMatter: 'marp: true\ntheme: default',
			body: '# Title\n',
		} );
	} );

	it( 'accepts blank lines inside the fences and a long closing line', () => {
		expect(
			splitAiFrontMatter(
				'---\n\nmarp: true\ntheme: default\npaginate: true\nheader: "Header"\n\n----------------------------\n\n# Title\n'
			)
		).toEqual( {
			frontMatter:
				'marp: true\ntheme: default\npaginate: true\nheader: "Header"',
			body: '# Title\n',
		} );
	} );

	it( 'accepts blank lines before the front matter', () => {
		expect(
			splitAiFrontMatter( '\n---\nmarp: true\n---\n# Title\n' )
		).toEqual( { frontMatter: 'marp: true', body: '# Title\n' } );
	} );

	it( 'keeps nested YAML', () => {
		expect(
			splitAiFrontMatter(
				'---\nmarp: true\nstyle: |\n  section {\n    color: red;\n  }\n---\n'
			).frontMatter
		).toBe( 'marp: true\nstyle: |\n  section {\n    color: red;\n  }' );
	} );

	it( 'leaves a leading separator followed by prose alone', () => {
		const markdown = '---\n\nSome text.\n\n---\n\nMore text.\n';
		expect( splitAiFrontMatter( markdown ) ).toEqual( {
			frontMatter: null,
			body: markdown,
		} );
	} );

	it( 'leaves Markdown without front matter alone', () => {
		expect( splitAiFrontMatter( '# Title\n' ) ).toEqual( {
			frontMatter: null,
			body: '# Title\n',
		} );
	} );
} );

describe( 'normalizeAiFrontMatter', () => {
	it( 'rewrites malformed front matter', () => {
		expect(
			normalizeAiFrontMatter(
				'---\n\nmarp: true\ntheme: default\n\n-------\n\n# Title\n'
			)
		).toBe( '---\nmarp: true\ntheme: default\n---\n\n# Title\n' );
	} );

	it( 'leaves Markdown without front matter alone', () => {
		expect( normalizeAiFrontMatter( '# Title\n\n---\n\nNext.\n' ) ).toBe(
			'# Title\n\n---\n\nNext.\n'
		);
	} );
} );
