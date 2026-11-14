/**
 * External dependencies
 */
import { SUPPORTED_LOCALES } from '@mark-bricks/editor/locales';
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import { WP_LOCALES } from './locale';

describe( 'WP_LOCALES', () => {
	it( 'maps a VS Code language to every locale the editor supports', () => {
		expect( [ ...new Set( Object.values( WP_LOCALES ) ) ].sort() ).toEqual(
			[ ...SUPPORTED_LOCALES ].sort()
		);
	} );
} );
