/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import {
	FONT_FAMILIES,
	getFontFamilyStack,
	isFontFamily,
} from './font-families';

describe( 'isFontFamily', () => {
	it( 'accepts every font family', () => {
		expect( FONT_FAMILIES.every( isFontFamily ) ).toBe( true );
	} );

	it( 'rejects other values', () => {
		expect( isFontFamily( 'Georgia, serif' ) ).toBe( false );
		expect( isFontFamily( 'toString' ) ).toBe( false );
		expect( isFontFamily( undefined ) ).toBe( false );
	} );
} );

describe( 'getFontFamilyStack', () => {
	it( 'returns the stack of a font family', () => {
		expect( getFontFamilyStack( 'serif' ) ).toContain( 'serif' );
	} );

	it( 'leaves the default font for the system font family', () => {
		expect( getFontFamilyStack( 'system' ) ).toBe( '' );
	} );
} );
