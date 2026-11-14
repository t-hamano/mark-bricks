/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import { MARP_GUIDE } from './marp-guide';
import { buildSystemPrompt } from './prompt';

describe( 'buildSystemPrompt', () => {
	it( 'includes the document with the selection', () => {
		const prompt = buildSystemPrompt( {
			selection: 'Two.\n',
			document: 'One.\n\n<selection>\nTwo.\n</selection>\n',
		} );
		expect( prompt ).toContain(
			'The user has selected part of the document.'
		);
		expect( prompt ).toContain(
			'<document>\nOne.\n\n<selection>\nTwo.\n</selection>\n</document>'
		);
	} );

	it( 'says where new content goes when nothing is selected', () => {
		expect(
			buildSystemPrompt( {
				selection: '',
				document: 'One.\n\n<selection></selection>\n',
			} )
		).toContain( 'The user has not selected anything.' );
	} );

	it( 'asks the model to find the part to change when nothing is selected', () => {
		const prompt = buildSystemPrompt( {
			selection: '',
			document: '# Title\n\n<selection></selection>\n',
		} );
		expect( prompt ).toContain( 'without asking them to select it' );
		expect( prompt ).toContain( '"replace_text"' );
	} );

	it( 'keeps edits on the selection when there is one', () => {
		expect(
			buildSystemPrompt( {
				selection: 'Two.\n',
				document: '<selection>\nTwo.\n</selection>\n',
			} )
		).toContain( 'Edit the selection, unless' );
	} );

	it( 'asks for answers only when the document is not available', () => {
		const prompt = buildSystemPrompt( null );
		expect( prompt ).toContain( 'you cannot edit it' );
		expect( prompt ).not.toContain( '<document>' );
	} );

	it( 'adds the Marp guide before the document of a Marp deck', () => {
		const prompt = buildSystemPrompt( {
			selection: '',
			document: '---\nmarp: true\n---\n\n<selection></selection>\n',
		} );
		expect( prompt ).toContain( MARP_GUIDE );
		expect( prompt.indexOf( MARP_GUIDE ) ).toBeLessThan(
			prompt.indexOf( '<document>' )
		);
	} );

	it( 'leaves the Marp guide out of other documents', () => {
		const prompt = buildSystemPrompt( {
			selection: '',
			document: '---\ntitle: Notes\n---\n\n<selection></selection>\n',
		} );
		expect( prompt ).not.toContain( '<marp_guide>' );
	} );
} );
