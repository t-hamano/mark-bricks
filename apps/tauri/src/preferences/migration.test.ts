/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import { migrate } from './migration';

function fontFamilyAfterMigration( fontFamily: unknown, version = 2 ) {
	const scopes = migrate( version, {
		'mark-bricks': { editorStyles: { fontSize: 15, fontFamily } },
	} );
	return scopes[ 'mark-bricks' ].editorStyles;
}

describe( 'migrate', () => {
	it( 'turns a saved font stack into its font family', () => {
		expect(
			fontFamilyAfterMigration(
				"Georgia, Cambria, 'Times New Roman', Times, serif"
			)
		).toEqual( { fontSize: 15, fontFamily: 'serif' } );
	} );

	it( 'turns the empty default into the system font family', () => {
		expect( fontFamilyAfterMigration( '' ) ).toEqual( {
			fontSize: 15,
			fontFamily: 'system',
		} );
	} );

	it( 'falls back to the system font family for an unknown stack', () => {
		expect( fontFamilyAfterMigration( 'Papyrus, fantasy' ) ).toEqual( {
			fontSize: 15,
			fontFamily: 'system',
		} );
	} );

	it( 'keeps a font family', () => {
		expect( fontFamilyAfterMigration( 'monospace' ) ).toEqual( {
			fontSize: 15,
			fontFamily: 'monospace',
		} );
	} );

	it( 'leaves preferences without a font family alone', () => {
		const scopes = { 'mark-bricks': { editorStyles: { fontSize: 15 } } };
		expect( migrate( 2, scopes ) ).toEqual( scopes );
	} );

	it( 'leaves current preferences alone', () => {
		expect( fontFamilyAfterMigration( 'Papyrus, fantasy', 3 ) ).toEqual( {
			fontSize: 15,
			fontFamily: 'Papyrus, fantasy',
		} );
	} );
} );
