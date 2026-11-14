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
	it( 'leaves the document out, so the prompt stays the same as it changes', () => {
		const prompt = buildSystemPrompt( '# Title\n\nOne.\n' );
		expect( prompt ).not.toContain( 'One.' );
		expect( prompt ).toBe( buildSystemPrompt( '# Other\n' ) );
	} );

	it( 'explains the context that comes with the messages', () => {
		const prompt = buildSystemPrompt( '# Title\n' );
		expect( prompt ).toContain( '<document_changes>' );
		expect( prompt ).toContain( '"after-line"' );
		expect( prompt ).toContain( 'without the line numbers' );
	} );

	it( 'covers editing with and without a selection', () => {
		const prompt = buildSystemPrompt( '# Title\n' );
		expect( prompt ).toContain( 'When there is a selection, edit it' );
		expect( prompt ).toContain( 'without asking them to select it' );
	} );

	it( 'asks for answers only when the document is not available', () => {
		const prompt = buildSystemPrompt( null );
		expect( prompt ).toContain( 'you cannot edit it' );
		expect( prompt ).not.toContain( '<document' );
	} );

	it( 'adds the Marp guide for a Marp deck', () => {
		expect(
			buildSystemPrompt( '---\nmarp: true\n---\n\n# Title\n' )
		).toContain( MARP_GUIDE );
	} );

	it( 'leaves the Marp guide out of other documents', () => {
		expect(
			buildSystemPrompt( '---\ntitle: Notes\n---\n\n# Title\n' )
		).not.toContain( '<marp_guide>' );
	} );
} );
