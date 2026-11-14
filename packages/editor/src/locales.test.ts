/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import { SUPPORTED_LOCALES } from './locales';

describe( 'SUPPORTED_LOCALES', () => {
	it( 'lists English and every locale with a catalog', () => {
		const catalogs = Object.keys(
			import.meta.glob( '../languages/mark-bricks-*.json' )
		).flatMap( ( path ) => {
			const match = path.match(
				/\/mark-bricks-(?!override-)(.+)\.json$/
			);
			return match ? [ match[ 1 ] ] : [];
		} );
		expect( [ ...SUPPORTED_LOCALES ].sort() ).toEqual(
			[ 'en', ...catalogs ].sort()
		);
	} );
} );
