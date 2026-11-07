/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { applyPreferredLocale, findLocale } from './i18n';

const LOCALES = [ 'de_DE', 'ja', 'pt_BR', 'zh_CN', 'zh_TW' ];

describe( 'findLocale', () => {
	it( 'matches the language and region', () => {
		expect( findLocale( [ 'de-DE' ], LOCALES ) ).toBe( 'de_DE' );
		expect( findLocale( [ 'ja' ], LOCALES ) ).toBe( 'ja' );
	} );

	it( 'falls back to a locale with the same language', () => {
		expect( findLocale( [ 'de-AT' ], LOCALES ) ).toBe( 'de_DE' );
		expect( findLocale( [ 'ja-JP' ], LOCALES ) ).toBe( 'ja' );
		expect( findLocale( [ 'pt' ], LOCALES ) ).toBe( 'pt_BR' );
	} );

	it( 'tells Traditional from Simplified Chinese', () => {
		expect( findLocale( [ 'zh-Hant' ], LOCALES ) ).toBe( 'zh_TW' );
		expect( findLocale( [ 'zh-HK' ], LOCALES ) ).toBe( 'zh_TW' );
		expect( findLocale( [ 'zh' ], LOCALES ) ).toBe( 'zh_CN' );
		expect( findLocale( [ 'zh-Hans-SG' ], LOCALES ) ).toBe( 'zh_CN' );
	} );

	it( 'tries the languages in order of preference', () => {
		expect( findLocale( [ 'nl', 'ja' ], LOCALES ) ).toBe( 'ja' );
	} );

	it( 'stops at English, or finds none', () => {
		expect( findLocale( [ 'en-US', 'ja' ], LOCALES ) ).toBeNull();
		expect( findLocale( [ 'nl' ], LOCALES ) ).toBeNull();
		expect( findLocale( [], LOCALES ) ).toBeNull();
	} );
} );

describe( 'applyPreferredLocale', () => {
	it( 'translates the strings into the locale it picks', () => {
		expect( applyPreferredLocale( [ 'ja-JP' ] ) ).toBe( 'ja' );
		expect( __( 'Next slide', 'mark-bricks' ) ).toBe( '次のスライド' );
	} );
} );
