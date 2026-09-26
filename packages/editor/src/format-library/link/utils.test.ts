/**
 * External dependencies
 */
import { describe, it, expect } from 'vitest';

/**
 * WordPress dependencies
 */
import type { RichTextValue } from '@wordpress/rich-text';

/**
 * Internal dependencies
 */
import { LINK_FORMAT, getLinkValue, setLink } from './utils';

const OBJECT_REPLACEMENT_CHARACTER = '￼';

const badge = {
	type: 'core/image',
	attributes: { url: 'badge.svg', alt: 'alt' },
};

function linkFormat( url: string ) {
	return { type: LINK_FORMAT, attributes: { url } };
}

/**
 * Builds a value whose characters all share one link, with the caret inside.
 *
 * @param text         The linked text.
 * @param url          The link's URL.
 * @param replacements Objects at the replacement characters in `text`.
 */
function linkedValue(
	text: string,
	url: string,
	replacements: RichTextValue[ 'replacements' ] = []
): RichTextValue {
	const format = linkFormat( url );
	return {
		text,
		formats: Array.from( text, () => [ format ] ),
		replacements,
		start: 0,
		end: 0,
	} as unknown as RichTextValue;
}

describe( 'setLink', () => {
	it( 'keeps a linked image when only the URL changes', () => {
		const value = linkedValue( OBJECT_REPLACEMENT_CHARACTER, 'https://a', [
			badge,
		] as RichTextValue[ 'replacements' ] );
		const link = getLinkValue( value, { url: 'https://a' }, true );

		const result = setLink( value, true, { ...link, url: 'https://b' } );

		expect( result.text ).toBe( OBJECT_REPLACEMENT_CHARACTER );
		expect( result.replacements[ 0 ] ).toEqual( badge );
		expect( result.formats[ 0 ] ).toEqual( [
			{ type: LINK_FORMAT, attributes: { url: 'https://b' } },
		] );
	} );

	it( 'keeps the text when only the URL changes', () => {
		const value = linkedValue( 'docs', 'https://a' );
		const link = getLinkValue( value, { url: 'https://a' }, true );

		const result = setLink( value, true, { ...link, url: 'https://b' } );

		expect( result.text ).toBe( 'docs' );
		expect( result.formats[ 3 ] ).toEqual( [
			{ type: LINK_FORMAT, attributes: { url: 'https://b' } },
		] );
	} );

	it( 'replaces the text when it is edited', () => {
		const value = linkedValue( 'docs', 'https://a' );

		const result = setLink( value, true, {
			text: 'guide',
			url: 'https://a',
			title: '',
		} );

		expect( result.text ).toBe( 'guide' );
	} );

	it( 'inserts the URL as the text of a new link at a collapsed caret', () => {
		const value = {
			text: '',
			formats: [],
			replacements: [],
			start: 0,
			end: 0,
		} as unknown as RichTextValue;

		const result = setLink( value, false, {
			text: '',
			url: 'https://a',
			title: '',
		} );

		expect( result.text ).toBe( 'https://a' );
	} );
} );
