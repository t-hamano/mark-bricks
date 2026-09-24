/**
 * WordPress dependencies
 */
import { setLocaleData, type LocaleData } from '@wordpress/i18n';

const TEXT_DOMAIN = 'mark-bricks';

// VS Code display language IDs mapped to the WordPress locale slugs the editor
// uses as locale codes.
// See https://code.visualstudio.com/docs/configure/locales#_available-locales
const WP_LOCALES: Partial< Record< string, string > > = {
	en: 'en',
	'zh-cn': 'zh_CN',
	'zh-tw': 'zh_TW',
	fr: 'fr_FR',
	de: 'de_DE',
	it: 'it_IT',
	es: 'es_ES',
	ja: 'ja',
	ko: 'ko_KR',
	ru: 'ru_RU',
	'pt-br': 'pt_BR',
	tr: 'tr_TR',
	pl: 'pl_PL',
	cs: 'cs_CZ',
	hu: 'hu_HU',
};

type Catalog = {
	locale_data: Partial< Record< string, LocaleData< string > > >;
};

// Extension-only strings, compiled by `pnpm i18n:make-json`. The editor
// package ships its own `mark-bricks` (+ Gutenberg `default`) catalog, so these
// files hold just the webview's strings for the same `mark-bricks` domain.
// Every locale on disk is picked up, keyed by the code in its file name.
const CATALOGS: Partial< Record< string, Catalog > > = Object.fromEntries(
	Object.entries(
		import.meta.glob< Catalog >( '../../languages/mark-bricks-*.json', {
			eager: true,
			import: 'default',
		} )
	).map( ( [ path, catalog ] ) => [
		path.replace( /^.*mark-bricks-(.+)\.json$/, '$1' ),
		catalog,
	] )
);

/**
 * Converts a VS Code display language ID to the WordPress locale slug that
 * the editor's `applyLocale` expects.
 *
 * @param lang VS Code display language ID (`vscode.env.language`).
 * @return WordPress locale slug.
 */
export function resolveVsCodeLocale( lang: string ): string {
	return WP_LOCALES[ lang ] ?? lang;
}

/**
 * Merges the extension's own translations into the `mark-bricks` domain.
 *
 * Runs after the editor's `applyLocale`, which seeds the domain. `setLocaleData`
 * merges at the message-key level, so the extension strings layer on top
 * without dropping the editor's keys. English needs no catalog (msgids are
 * English).
 *
 * @param locale Locale slug already applied by the editor's `applyLocale`.
 */
export function applyVsCodeLocale( locale: string ) {
	const dict = CATALOGS[ locale ]?.locale_data?.[ TEXT_DOMAIN ];
	if ( dict ) {
		setLocaleData( dict, TEXT_DOMAIN );
	}
}
