/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import { isMarpContextDocument } from './marp-guide';

describe( 'isMarpContextDocument', () => {
	it( 'detects a Marp deck with the selection after the front matter', () => {
		expect(
			isMarpContextDocument(
				'---\nmarp: true\n---\n\n<selection>\n# Title\n</selection>\n'
			)
		).toBe( true );
	} );

	it( 'detects a Marp deck with the selection at the start', () => {
		expect(
			isMarpContextDocument(
				'<selection>\n---\nmarp: true\n---\n</selection>\n\n# Title\n'
			)
		).toBe( true );
		expect(
			isMarpContextDocument(
				'<selection></selection>---\nmarp: true\n---\n'
			)
		).toBe( true );
	} );

	it( 'returns false without marp: true', () => {
		expect(
			isMarpContextDocument(
				'---\nmarp: false\n---\n\n<selection></selection>\n'
			)
		).toBe( false );
		expect(
			isMarpContextDocument( '# Notes\n\n<selection></selection>\n' )
		).toBe( false );
	} );
} );
