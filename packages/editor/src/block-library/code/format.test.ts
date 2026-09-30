/**
 * External dependencies
 */
import { describe, it, expect } from 'vitest';

/**
 * Internal dependencies
 */
import { formatForLanguage, isMathLanguage } from './format';

describe( 'isMathLanguage', () => {
	it( 'ignores case and surrounding spaces', () => {
		expect( isMathLanguage( ' Math ' ) ).toBe( true );
	} );

	it( 'rejects other languages and a missing language', () => {
		expect( isMathLanguage( 'maths' ) ).toBe( false );
		expect( isMathLanguage( undefined ) ).toBe( false );
	} );
} );

describe( 'formatForLanguage', () => {
	it( 'switches a block that becomes math to the dollar format', () => {
		expect( formatForLanguage( 'fenced-backtick', 'js', 'math' ) ).toBe(
			'dollar'
		);
		expect( formatForLanguage( 'fenced-tilde', undefined, 'math' ) ).toBe(
			'dollar'
		);
	} );

	it( 'keeps the fence of a math block that stays math', () => {
		expect( formatForLanguage( 'fenced-backtick', 'math', 'Math' ) ).toBe(
			'fenced-backtick'
		);
	} );

	it( 'switches a dollar block that stops being math to a backtick fence', () => {
		expect( formatForLanguage( 'dollar', 'math', 'js' ) ).toBe(
			'fenced-backtick'
		);
	} );

	it( 'keeps the format of a block that is not math', () => {
		expect( formatForLanguage( 'fenced-tilde', 'js', 'ts' ) ).toBe(
			'fenced-tilde'
		);
	} );
} );
