/**
 * WordPress dependencies
 */
import { setLocaleData, type LocaleData } from '@wordpress/i18n';

const TEXT_DOMAIN = 'mark-bricks';

// The strings of every locale, compiled by `pnpm i18n:make-json`, keyed by
// the WordPress locale slug in each file's name (e.g. `ja`, `pt_BR`). The
// page carries all of them, and picks one for its reader.
const CATALOGS: Partial< Record< string, LocaleData< string > > > =
	Object.fromEntries(
		Object.entries(
			import.meta.glob<
				Partial< Record< string, LocaleData< string > > >
			>( '../../../languages/mark-bricks-*.json', {
				eager: true,
				import: 'locale_data',
			} )
		).map( ( [ path, localeData ] ) => [
			path.replace( /^.*mark-bricks-(.+)\.json$/, '$1' ),
			localeData[ TEXT_DOMAIN ],
		] )
	);

// The subtags of a Chinese language tag that ask for Traditional Chinese.
const TRADITIONAL_CHINESE = [ 'hant', 'tw', 'hk', 'mo' ];

function toLanguageTag( locale: string ): string {
	return locale.toLowerCase().replace( '_', '-' );
}

/**
 * Finds the locale to show a reader, from the languages their browser
 * prefers. A language tag matches a locale with the same language and
 * region, and then one with the same language. English, or no match, means
 * no locale: the strings are in English already.
 *
 * @param languages Language tags, in order of preference, as in
 *                  `navigator.languages` (e.g. `de-AT`).
 * @param locales   WordPress locale slugs with strings (e.g. `de_DE`).
 * @return The locale slug, or `null` for English.
 */
export function findLocale(
	languages: readonly string[],
	locales: readonly string[]
): string | null {
	for ( const tag of languages ) {
		const [ language, ...subtags ] = tag.toLowerCase().split( '-' );
		if ( language === 'en' ) {
			return null;
		}
		let index = locales.findIndex(
			( locale ) => toLanguageTag( locale ) === tag.toLowerCase()
		);
		if ( index === -1 && language === 'zh' ) {
			const traditional = subtags.some( ( subtag ) =>
				TRADITIONAL_CHINESE.includes( subtag )
			);
			index = locales.indexOf( traditional ? 'zh_TW' : 'zh_CN' );
		}
		if ( index === -1 ) {
			index = locales.findIndex(
				( locale ) =>
					toLanguageTag( locale ).split( '-' )[ 0 ] === language
			);
		}
		if ( index !== -1 ) {
			return locales[ index ];
		}
	}
	return null;
}

/**
 * Applies the translations for the locale that the reader's browser prefers
 * to `@wordpress/i18n`.
 *
 * @param languages Language tags, in order of preference.
 * @return The locale slug chosen, or `null` for English.
 */
export function applyPreferredLocale(
	languages: readonly string[]
): string | null {
	const locale = findLocale( languages, Object.keys( CATALOGS ) );
	const dict = locale ? CATALOGS[ locale ] : undefined;
	if ( dict ) {
		setLocaleData( dict, TEXT_DOMAIN );
	}
	return locale;
}
