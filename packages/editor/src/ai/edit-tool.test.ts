/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import { toEdit, toToolInput } from './edit-tool';

describe( 'toEdit', () => {
	it( 'reads an edit of the selection', () => {
		expect(
			toEdit( { action: 'replace', find: '', markdown: 'New' } )
		).toEqual( { action: 'replace', markdown: 'New' } );
	} );

	it( 'reads a replacement of text', () => {
		expect(
			toEdit( { action: 'replace_text', find: 'Old', markdown: 'New' } )
		).toEqual( { action: 'replace_text', find: 'Old', markdown: 'New' } );
	} );

	it( 'rejects a replacement of text without the text', () => {
		expect( toEdit( { action: 'replace_text', markdown: 'New' } ) ).toBe(
			null
		);
	} );

	it( 'rejects an unknown action', () => {
		expect( toEdit( { action: 'delete', markdown: 'New' } ) ).toBe( null );
	} );
} );

describe( 'toToolInput', () => {
	it( 'sends an empty find for an edit of the selection', () => {
		expect(
			toToolInput( { action: 'insert_after', markdown: 'New' } )
		).toEqual( { action: 'insert_after', find: '', markdown: 'New' } );
	} );
} );
