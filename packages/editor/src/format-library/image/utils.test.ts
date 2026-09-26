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
import { IMAGE_FORMAT, insertImage, updateImage } from './utils';

const OBJECT_REPLACEMENT_CHARACTER = '￼';

function textValue( text: string, start: number, end = start ): RichTextValue {
	return {
		text,
		formats: Array.from( text, () => undefined ),
		replacements: Array.from( text, () => undefined ),
		start,
		end,
	} as unknown as RichTextValue;
}

describe( 'insertImage', () => {
	it( 'inserts an image at the caret', () => {
		const result = insertImage( textValue( 'ab', 1 ), {
			url: 'image.png',
			alt: 'alt',
			title: '',
		} );

		expect( result.text ).toBe( `a${ OBJECT_REPLACEMENT_CHARACTER }b` );
		expect( result.replacements[ 1 ] ).toEqual( {
			type: IMAGE_FORMAT,
			attributes: { url: 'image.png', alt: 'alt' },
		} );
	} );

	it( 'replaces the selected text', () => {
		const result = insertImage( textValue( 'abc', 1, 2 ), {
			url: 'image.png',
			alt: '',
			title: 'Title',
		} );

		expect( result.text ).toBe( `a${ OBJECT_REPLACEMENT_CHARACTER }c` );
		expect( result.replacements[ 1 ] ).toEqual( {
			type: IMAGE_FORMAT,
			attributes: { url: 'image.png', alt: '', title: 'Title' },
		} );
	} );
} );

describe( 'updateImage', () => {
	const existing = {
		url: 'old.png',
		alt: 'old',
		title: 'Old',
		titleQuote: "'",
	};

	function imageValue(): RichTextValue {
		const value = textValue( `a${ OBJECT_REPLACEMENT_CHARACTER }b`, 1, 2 );
		value.replacements[ 1 ] = {
			type: IMAGE_FORMAT,
			attributes: existing,
		} as ( typeof value.replacements )[ number ];
		return value;
	}

	it( 'updates the selected image and keeps the title delimiter', () => {
		const result = updateImage(
			imageValue(),
			{ url: 'new.png', alt: 'new', title: 'New' },
			existing
		);

		expect( result.replacements[ 1 ] ).toEqual( {
			type: IMAGE_FORMAT,
			attributes: {
				url: 'new.png',
				alt: 'new',
				title: 'New',
				titleQuote: "'",
			},
		} );
	} );

	it( 'drops the title delimiter along with a cleared title', () => {
		const result = updateImage(
			imageValue(),
			{ url: 'old.png', alt: 'old', title: '' },
			existing
		);

		expect( result.replacements[ 1 ] ).toEqual( {
			type: IMAGE_FORMAT,
			attributes: { url: 'old.png', alt: 'old' },
		} );
	} );
} );
