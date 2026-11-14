/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import { withCustomInstructions } from './instructions';

describe( 'withCustomInstructions', () => {
	it( 'puts the instructions before the system prompt', () => {
		expect(
			withCustomInstructions( 'You are the assistant.', ' Be brief. \n' )
		).toBe(
			[
				'The user gave these instructions for every conversation. Follow them, unless they conflict with the instructions after them.',
				'<custom_instructions>',
				'Be brief.',
				'</custom_instructions>',
				'',
				'You are the assistant.',
			].join( '\n' )
		);
	} );

	it.each( [ '', '  \n', undefined, 42 ] )(
		'keeps the system prompt without instructions (%s)',
		( instructions ) => {
			expect(
				withCustomInstructions( 'You are the assistant.', instructions )
			).toBe( 'You are the assistant.' );
		}
	);
} );
