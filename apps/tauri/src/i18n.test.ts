/**
 * External dependencies
 */
import { SUPPORTED_LOCALES } from '@mark-bricks/editor/locales';
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import { LOCALES } from './i18n';

describe( 'LOCALES', () => {
	it( 'offers every locale the editor supports', () => {
		expect( LOCALES.map( ( { code } ) => code ).sort() ).toEqual(
			[ ...SUPPORTED_LOCALES ].sort()
		);
	} );
} );
