/**
 * External dependencies
 */
import { describe, it, expect } from 'vitest';

/**
 * Internal dependencies
 */
import { markdownToBlocks } from '../converter';
import {
	escapeMarkdown,
	fillPlaceholders,
	getPlaceholderKeys,
} from './placeholders';

describe( 'getPlaceholderKeys', () => {
	it( 'lists each key once, in order', () => {
		expect( getPlaceholderKeys( '# {{b}}\n\n{{a}} {{b}}' ) ).toEqual( [
			'b',
			'a',
		] );
	} );
} );

describe( 'fillPlaceholders', () => {
	it( 'replaces each placeholder with its escaped text', () => {
		expect(
			fillPlaceholders(
				'# {{title}}\n\n{{body}}',
				{ title: 'A', body: 'B' },
				( text ) => `[${ text }]`
			)
		).toBe( '# [A]\n\n[B]' );
	} );

	it( 'keeps a placeholder without a text', () => {
		expect( fillPlaceholders( '{{missing}}', {}, ( t ) => t ) ).toBe(
			'{{missing}}'
		);
	} );

	it( 'does not replace placeholders within a text', () => {
		expect(
			fillPlaceholders(
				'{{a}}',
				{ a: '{{b}}', b: 'B' },
				( text ) => text
			)
		).toBe( '{{b}}' );
	} );
} );

describe( 'escapeMarkdown', () => {
	it.each( [
		'**bold** and _emphasis_',
		'`code` and $x$',
		'[link](target)',
		'<span>html</span> & more',
		'# not a heading',
		'- not a list',
		'+ not a list',
		'1. not a list',
		'2) not a list',
		'> not a quote',
		'a | b ~~c~~ !',
		'back\\slash',
	] )( 'keeps %j as plain text in a paragraph', ( text ) => {
		const [ block ] = markdownToBlocks( escapeMarkdown( text ) );
		expect( block.name ).toBe( 'core/paragraph' );
		expect( String( block.attributes.content ) ).toBe(
			text.replace( /&/g, '&amp;' ).replace( /</g, '&lt;' )
		);
	} );

	it( 'joins lines', () => {
		expect( escapeMarkdown( 'one\n two\r\nthree' ) ).toBe(
			'one two three'
		);
	} );
} );
