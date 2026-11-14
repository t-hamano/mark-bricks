/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import {
	findMarpDirectiveComment,
	joinMarpClasses,
	parseMarpDirectiveComment,
	serializeMarpDirectiveComment,
	setMarpDirectiveComment,
	splitMarpClasses,
} from './marp-directives';

describe( 'parseMarpDirectiveComment', () => {
	it( 'reads a one-line spot directive', () => {
		expect(
			parseMarpDirectiveComment( ' _class: lead invert ' )
		).toMatchObject( {
			values: { class: 'lead invert' },
			isSpot: true,
			otherLines: [],
		} );
	} );

	it( 'reads an empty value', () => {
		expect(
			parseMarpDirectiveComment( "\n_class: lead\n_header: ''\n" )
		).toMatchObject( {
			values: { class: 'lead', header: '' },
			isSpot: true,
			otherLines: [],
		} );
	} );

	it( 'reads several local directives and unquotes values', () => {
		expect(
			parseMarpDirectiveComment(
				'\nheader: "Hello: world"\npaginate: true\n'
			)
		).toMatchObject( {
			values: { header: 'Hello: world', paginate: 'true' },
			isSpot: false,
			otherLines: [],
		} );
	} );

	it( 'keeps other keys and values it cannot show as other lines', () => {
		expect(
			parseMarpDirectiveComment(
				'\n_class: lead\n_backgroundSize: cover\nclass: [a, b]\n'
			)
		).toMatchObject( {
			values: { class: 'lead' },
			isSpot: true,
			otherLines: [ '_backgroundSize: cover', 'class: [a, b]' ],
		} );
	} );

	it( 'ignores a presenter note', () => {
		expect( parseMarpDirectiveComment( ' Remember to smile ' ) ).toBeNull();
		expect(
			parseMarpDirectiveComment( '\nNote: hello\n_class: lead\nmore\n' )
		).toBeNull();
	} );

	it( 'ignores a comment without a known directive', () => {
		expect( parseMarpDirectiveComment( ' fit: true ' ) ).toBeNull();
	} );
} );

describe( 'serializeMarpDirectiveComment', () => {
	it( 'writes one line on one line', () => {
		expect(
			serializeMarpDirectiveComment( {
				values: { class: 'lead' },
				isSpot: true,
				otherLines: [],
			} )
		).toBe( '<!-- _class: lead -->' );
	} );

	it( 'writes several lines in the order of the directives', () => {
		expect(
			serializeMarpDirectiveComment( {
				values: { footer: 'A: b', class: 'invert', paginate: 'false' },
				isSpot: false,
				otherLines: [ 'backgroundSize: cover' ],
			} )
		).toBe(
			'<!--\nclass: invert\npaginate: false\nfooter: "A: b"\nbackgroundSize: cover\n-->'
		);
	} );

	it( 'writes an empty value as an empty string', () => {
		expect(
			serializeMarpDirectiveComment( {
				values: { header: ' ' },
				isSpot: true,
				otherLines: [],
			} )
		).toBe( '<!-- _header: "" -->' );
	} );

	it( 'keeps the quotes of a value that did not change', () => {
		const comment = parseMarpDirectiveComment(
			"\n_class: lead\n_header: ''\n_footer: 'Hi'\n"
		);
		expect(
			serializeMarpDirectiveComment( {
				...comment!,
				values: { ...comment!.values, class: 'invert', footer: 'Bye' },
			} )
		).toBe( "<!--\n_class: invert\n_header: ''\n_footer: Bye\n-->" );
	} );

	it( 'keeps the scope of each directive in a mixed comment', () => {
		const comment = parseMarpDirectiveComment(
			'\nclass: invert\n_header: only here\n'
		);
		expect(
			serializeMarpDirectiveComment( {
				...comment!,
				values: { ...comment!.values, footer: 'Bye' },
			} )
		).toBe( '<!--\nclass: invert\n_header: only here\n_footer: Bye\n-->' );
	} );

	it( 'replaces a value it cannot show once its field is set', () => {
		const comment = parseMarpDirectiveComment(
			'\n_class: [lead, invert]\n_header: Hi\n'
		);
		expect(
			serializeMarpDirectiveComment( {
				...comment!,
				values: { ...comment!.values, class: 'invert' },
			} )
		).toBe( '<!--\n_class: invert\n_header: Hi\n-->' );
		expect( serializeMarpDirectiveComment( comment! ) ).toBe(
			'<!--\n_header: Hi\n_class: [lead, invert]\n-->'
		);
	} );

	it( 'escapes a comment terminator in a value', () => {
		const serialized = serializeMarpDirectiveComment( {
			values: { header: 'A --> B' },
			isSpot: true,
			otherLines: [],
		} );
		expect( serialized ).toBe( '<!-- _header: "A --\\u003E B" -->' );
		expect( findMarpDirectiveComment( serialized )?.values ).toEqual( {
			header: 'A --> B',
		} );
	} );

	it( 'keeps both scopes of the same directive', () => {
		const comment = parseMarpDirectiveComment(
			'\nclass: invert\n_class: lead\n'
		);
		expect(
			serializeMarpDirectiveComment( {
				...comment!,
				values: { ...comment!.values, footer: 'Bye' },
			} )
		).toBe( '<!--\nclass: invert\n_footer: Bye\n_class: lead\n-->' );
	} );

	it( 'reads a comment that holds only values it cannot show', () => {
		const html = '<!-- _class: [lead, invert] -->';
		const found = findMarpDirectiveComment( html );
		expect( found ).toMatchObject( {
			values: {},
			otherLines: [ '_class: [lead, invert]' ],
		} );
		expect(
			setMarpDirectiveComment( html, {
				...found!,
				values: { class: 'invert' },
			} )
		).toBe( '<!-- _class: invert -->' );
	} );

	it( 'writes nothing for no directives', () => {
		expect(
			serializeMarpDirectiveComment( {
				values: {},
				isSpot: true,
				otherLines: [],
			} )
		).toBe( '' );
	} );
} );

describe( 'findMarpDirectiveComment', () => {
	it( 'skips a presenter note and finds the directives after it', () => {
		const html = '<!-- a note -->\n<!-- _class: lead -->';
		expect( findMarpDirectiveComment( html ) ).toMatchObject( {
			values: { class: 'lead' },
			start: 16,
			end: html.length,
		} );
	} );
} );

describe( 'setMarpDirectiveComment', () => {
	const lead = { values: { class: 'lead' }, isSpot: true, otherLines: [] };

	it( 'writes the comment into an empty block', () => {
		expect( setMarpDirectiveComment( '', lead ) ).toBe(
			'<!-- _class: lead -->'
		);
	} );

	it( 'adds the comment before other HTML', () => {
		expect(
			setMarpDirectiveComment( '<style scoped>h1 {}</style>', lead )
		).toBe( '<!-- _class: lead -->\n<style scoped>h1 {}</style>' );
	} );

	it( 'replaces the comment in place', () => {
		expect(
			setMarpDirectiveComment(
				'<!-- note -->\n<!-- _class: invert -->\n<div></div>',
				lead
			)
		).toBe( '<!-- note -->\n<!-- _class: lead -->\n<div></div>' );
	} );

	it( 'removes an emptied comment with its line break', () => {
		const empty = { values: {}, isSpot: true, otherLines: [] };
		expect(
			setMarpDirectiveComment(
				'<!-- _class: lead -->\n<div></div>',
				empty
			)
		).toBe( '<div></div>' );
		expect(
			setMarpDirectiveComment(
				'<div></div>\n<!-- _class: lead -->',
				empty
			)
		).toBe( '<div></div>' );
	} );
} );

describe( 'Marp classes', () => {
	const classes = [ 'lead', 'invert', 'gaia' ];

	it( 'splits the theme classes from the others', () => {
		expect(
			splitMarpClasses( 'invert custom lead', classes )
		).toMatchObject( {
			selected: [ 'invert', 'lead' ],
			other: 'custom',
		} );
	} );

	it( 'joins the theme classes in the order of the theme', () => {
		expect(
			joinMarpClasses( [ 'invert', 'lead' ], ' custom  more ', classes )
		).toBe( 'lead invert custom more' );
	} );
} );
