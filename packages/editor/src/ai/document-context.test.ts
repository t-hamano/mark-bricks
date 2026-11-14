/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import {
	applyChange,
	buildMessageContext,
	formatChangedLines,
	formatDocument,
	formatSelection,
	MAX_CHANGES_LENGTH,
} from './document-context';
import { joinAroundSelection } from './edit-target';

const lines = ( count: number, word = 'Line' ) =>
	Array.from(
		{ length: count },
		( _, index ) => `${ word } ${ index + 1 }.`
	).join( '\n' ) + '\n';

describe( 'formatDocument', () => {
	it( 'numbers each line', () => {
		expect( formatDocument( '# Title\n\nOne.\n' ) ).toBe(
			'<document>\n1\t# Title\n2\t\n3\tOne.\n</document>'
		);
	} );

	it( 'shows an empty document', () => {
		expect( formatDocument( '' ) ).toBe( '<document>\n</document>' );
	} );
} );

describe( 'formatChangedLines', () => {
	it( 'returns nothing when the document is the same', () => {
		expect( formatChangedLines( 'One.\n', 'One.\n' ) ).toBe( '' );
	} );

	it( 'shows the changed lines with the lines around them', () => {
		const before = lines( 30 );
		const after = before.replace( 'Line 15.', 'Changed.' );
		const changes = formatChangedLines( before, after ).split( '\n' );
		expect( changes[ 0 ] ).toBe( '7\tLine 7.' );
		expect( changes ).toContain( '15\tChanged.' );
		expect( changes[ changes.length - 1 ] ).toBe( '23\tLine 23.' );
		expect( changes.join( '\n' ) ).not.toContain( 'Line 15.' );
	} );

	it( 'shows changes far apart separately', () => {
		const before = lines( 60 );
		const after = before
			.replace( 'Line 5.', 'First.' )
			.replace( 'Line 50.', 'Second.' );
		const changes = formatChangedLines( before, after );
		expect( changes ).toContain( '5\tFirst.' );
		expect( changes ).toContain( '\n...\n' );
		expect( changes ).toContain( '50\tSecond.' );
		expect( changes ).not.toContain( 'Line 25.' );
	} );

	it( 'numbers the lines as in the new document', () => {
		const before = lines( 20 );
		const after = 'New.\n' + before.replace( 'Line 10.', 'Changed.' );
		expect( formatChangedLines( before, after ) ).toContain(
			'11\tChanged.'
		);
	} );
} );

describe( 'formatSelection', () => {
	it( 'gives the lines and the text of the selection', () => {
		expect(
			formatSelection(
				joinAroundSelection( '# Title\n', 'One.\n\nTwo.\n', 'Three.\n' )
			)
		).toBe( '<selection lines="3-5">\nOne.\n\nTwo.\n</selection>' );
	} );

	it( 'gives the line new content goes after when nothing is selected', () => {
		expect(
			formatSelection( joinAroundSelection( '# Title\n', '', 'One.\n' ) )
		).toBe( '<selection after-line="2"></selection>' );
		expect(
			formatSelection( joinAroundSelection( '# Title\n', '', '' ) )
		).toBe( '<selection after-line="1"></selection>' );
		expect(
			formatSelection( joinAroundSelection( '', '', '# Title\n' ) )
		).toBe( '<selection after-line="0"></selection>' );
	} );

	it( 'ends a selection with a line break on the line before it', () => {
		const document = 'One.\nTwo.\nThree.\n';
		expect(
			formatSelection( {
				document,
				selection: 'Two.\n',
				selectionStart: 5,
				selectionEnd: 10,
			} )
		).toBe( '<selection lines="2-2">\nTwo.\n</selection>' );
	} );
} );

describe( 'buildMessageContext', () => {
	const context = joinAroundSelection( lines( 30 ), '', '' );

	it( 'sends the whole document when the model has not seen it', () => {
		expect( buildMessageContext( context, null ) ).toBe(
			formatDocument( context.document ) +
				'\n\n<selection after-line="30"></selection>'
		);
	} );

	it( 'sends only the selection when nothing changed', () => {
		expect( buildMessageContext( context, context.document ) ).toBe(
			'<selection after-line="30"></selection>'
		);
	} );

	it( 'sends the changed lines', () => {
		const previous = context.document.replace( 'Line 20.', 'Old.' );
		const result = buildMessageContext( context, previous );
		expect( result ).toMatch( /^<document_changes>\n/ );
		expect( result ).toContain( '20\tLine 20.' );
		expect( result ).not.toContain( '<document>' );
	} );

	it( 'sends the whole document again when the changes are long', () => {
		const long = joinAroundSelection(
			lines( 2000, 'A longer line of text' ),
			'',
			''
		);
		const previous = lines( 2000, 'Another line of text' );
		expect(
			formatChangedLines( previous, long.document ).length
		).toBeGreaterThan( MAX_CHANGES_LENGTH );
		const result = buildMessageContext( long, previous );
		expect( result ).toContain( 'The document changed a lot' );
		expect( result ).toContain( formatDocument( long.document ) );
	} );

	it( 'sends the empty document when the user removed everything', () => {
		const empty = joinAroundSelection( '', '', '' );
		expect( buildMessageContext( empty, 'One.\nTwo.\n' ) ).toBe(
			'The document changed a lot after your last answer. This is the whole document now.\n\n<document>\n</document>\n\n<selection after-line="0"></selection>'
		);
	} );

	it( 'sends the whole document again when it is shorter than the changes', () => {
		const short = joinAroundSelection( 'New.\n', '', '' );
		const result = buildMessageContext( short, 'Old.\n' );
		expect( result ).toContain( formatDocument( 'New.\n' ) );
	} );
} );

describe( 'applyChange', () => {
	it( 'takes the new document when the model knows the old one', () => {
		expect( applyChange( 'One.\n', 'One.\n', 'Two.\n' ) ).toBe( 'Two.\n' );
	} );

	it( 'leaves out changes the model has not been told about', () => {
		const seen = lines( 30 );
		const before = seen.replace( 'Line 25.', 'Typed by the user.' );
		const after = before.replace( 'Line 3.', 'Edited by the model.' );
		expect( applyChange( seen, before, after ) ).toBe(
			seen.replace( 'Line 3.', 'Edited by the model.' )
		);
	} );

	it( 'returns null when the change does not fit', () => {
		expect(
			applyChange( 'Something else.\n', 'One.\n', 'Two.\n' )
		).toBeNull();
	} );
} );
