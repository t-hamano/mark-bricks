/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * WordPress dependencies
 */
import { create, type RichTextValue } from '@wordpress/rich-text';

/**
 * Internal dependencies
 */
import { LINK_FORMAT, getFormatBoundary, getLinkValue, setLink } from './utils';

type Format = RichTextValue[ 'formats' ][ number ][ number ];

/**
 * Builds a value whose characters between `start` and `end` carry one link.
 *
 * The format is a single shared object across the run, the way rich-text
 * stores it, since that identity is what the boundary walk follows.
 *
 * @param text       The whole text.
 * @param range      Half-open range of the linked characters.
 * @param attributes Attributes of the link format.
 * @return The value, with no selection set.
 */
function withLink(
	text: string,
	range: [ number, number ],
	attributes: Record< string, string > = { url: 'https://example.com' }
): RichTextValue {
	const value = create( { text } );
	const format = { type: LINK_FORMAT, attributes } as unknown as Format;
	for ( let index = range[ 0 ]; index < range[ 1 ]; index++ ) {
		value.formats[ index ] = [ format ];
	}
	return value;
}

/**
 * Reads a value back as the HTML-ish shape the assertions compare against.
 *
 * @param value The value to describe.
 * @return The text, with the linked runs wrapped in their URL.
 */
function describeLinks( value: RichTextValue ): string {
	let result = '';
	let open: Format | undefined;
	for ( let index = 0; index <= value.text.length; index++ ) {
		const format = value.formats[ index ]?.find(
			( { type } ) => type === LINK_FORMAT
		);
		if ( open && format !== open ) {
			const { url, title } = (
				open as unknown as { attributes: Record< string, string > }
			 ).attributes;
			result += `](${ url }${ title ? ` "${ title }"` : '' })`;
			open = undefined;
		}
		if ( format && format !== open ) {
			result += '[';
			open = format;
		}
		result += value.text[ index ] ?? '';
	}
	return result;
}

describe( 'getFormatBoundary', () => {
	it( 'walks out to both edges of the link the caret sits in', () => {
		const value = {
			...withLink( 'a link here', [ 2, 6 ] ),
			start: 4,
			end: 4,
		};
		expect( getFormatBoundary( value ) ).toEqual( { start: 2, end: 6 } );
	} );

	it( 'stops at a caret parked past the end, where no link is active', () => {
		const value = {
			...withLink( 'a link here', [ 2, 6 ] ),
			start: 6,
			end: 6,
		};
		expect( getFormatBoundary( value ) ).toBeUndefined();
	} );

	it( 'covers the whole link a partial selection falls inside', () => {
		const value = {
			...withLink( 'a link here', [ 2, 6 ] ),
			start: 3,
			end: 5,
		};
		expect( getFormatBoundary( value ) ).toEqual( { start: 2, end: 6 } );
	} );

	it( 'covers a link that starts the text', () => {
		const value = {
			...withLink( 'link here', [ 0, 4 ] ),
			start: 1,
			end: 1,
		};
		expect( getFormatBoundary( value ) ).toEqual( { start: 0, end: 4 } );
	} );

	it( 'tells two neighbouring links to the same URL apart', () => {
		const value = withLink( 'onetwo', [ 0, 3 ] );
		const second = {
			type: LINK_FORMAT,
			attributes: { url: 'https://example.com' },
		} as unknown as Format;
		value.formats[ 3 ] = [ second ];
		value.formats[ 4 ] = [ second ];
		value.formats[ 5 ] = [ second ];
		expect( getFormatBoundary( { ...value, start: 4, end: 4 } ) ).toEqual( {
			start: 3,
			end: 6,
		} );
	} );

	it( 'returns nothing when the selection is not on a link', () => {
		const value = {
			...withLink( 'a link here', [ 2, 6 ] ),
			start: 9,
			end: 9,
		};
		expect( getFormatBoundary( value ) ).toBeUndefined();
	} );
} );

describe( 'getLinkValue', () => {
	it( 'reads the whole link the caret sits in, not just the selection', () => {
		const value = {
			...withLink( 'a link here', [ 2, 6 ] ),
			start: 3,
			end: 4,
		};
		expect(
			getLinkValue(
				value,
				{ url: 'https://example.com', title: 'Example' },
				true
			)
		).toEqual( {
			text: 'link',
			url: 'https://example.com',
			title: 'Example',
		} );
	} );

	it( 'falls back to the selected text when there is no link yet', () => {
		const value = {
			...create( { text: 'a link here' } ),
			start: 2,
			end: 6,
		};
		expect( getLinkValue( value, {}, false ) ).toEqual( {
			text: 'link',
			url: '',
			title: '',
		} );
	} );
} );

describe( 'setLink', () => {
	it( 'links the selected text', () => {
		const value = {
			...create( { text: 'a link here' } ),
			start: 2,
			end: 6,
		};
		const result = setLink( value, false, {
			text: 'link',
			url: 'https://example.com',
			title: '',
		} );
		expect( describeLinks( result ) ).toBe(
			'a [link](https://example.com) here'
		);
	} );

	it( 'writes the URL as the text when the caret is collapsed', () => {
		const value = { ...create( { text: 'go ' } ), start: 3, end: 3 };
		const result = setLink( value, false, {
			text: '',
			url: 'https://example.com',
			title: '',
		} );
		expect( describeLinks( result ) ).toBe(
			'go [https://example.com](https://example.com)'
		);
	} );

	it( 'rewrites a link in place when only the URL changes', () => {
		const value = {
			...withLink( 'a link here', [ 2, 6 ] ),
			start: 4,
			end: 4,
		};
		const result = setLink( value, true, {
			text: 'link',
			url: 'https://other.test',
			title: 'Other',
		} );
		expect( describeLinks( result ) ).toBe(
			'a [link](https://other.test "Other") here'
		);
	} );

	it( 'replaces the link text without touching the text around it', () => {
		const value = {
			...withLink( 'a link here', [ 2, 6 ] ),
			start: 4,
			end: 4,
		};
		const result = setLink( value, true, {
			text: 'anchor',
			url: 'https://example.com',
			title: '',
		} );
		expect( describeLinks( result ) ).toBe(
			'a [anchor](https://example.com) here'
		);
	} );

	it( 'replaces the link and not an earlier copy of the same text', () => {
		const value = {
			...withLink( 'link link', [ 5, 9 ] ),
			start: 6,
			end: 6,
		};
		const result = setLink( value, true, {
			text: 'second',
			url: 'https://example.com',
			title: '',
		} );
		expect( describeLinks( result ) ).toBe(
			'link [second](https://example.com)'
		);
	} );

	it( 'drops the syntax a bare URL was recorded with', () => {
		const value = {
			...withLink( 'see https://example.com', [ 4, 23 ], {
				url: 'https://example.com',
				'data-markdown-link': 'literal',
			} ),
			start: 10,
			end: 10,
		};
		const result = setLink( value, true, {
			text: 'the site',
			url: 'https://example.com',
			title: '',
		} );
		const format = result.formats[ 4 ].find(
			( { type } ) => type === LINK_FORMAT
		) as unknown as { attributes: Record< string, string > };
		expect( format.attributes ).toEqual( { url: 'https://example.com' } );
		expect( describeLinks( result ) ).toBe(
			'see [the site](https://example.com)'
		);
	} );
} );
