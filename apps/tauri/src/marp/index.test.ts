/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import { isMarpDocument } from '.';

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
