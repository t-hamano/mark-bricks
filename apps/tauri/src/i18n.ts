/**
 * WordPress dependencies
 */
import { setLocaleData, type LocaleData } from '@wordpress/i18n';

const TEXT_DOMAIN = 'mark-bricks';

// Languages offered in the language setting, identified by WordPress locale
// slug (the code the editor's `setupEditor` takes). `name` is written in the
// language itself, and `tags` lists the lower-cased OS language tags that
// pick it.
export const LOCALES = [
	{ code: 'en', name: 'English', tags: [ 'en' ] },
	{ code: 'ja', name: '日本語', tags: [ 'ja' ] },
	{
		code: 'zh_CN',
		name: '简体中文',
		tags: [ 'zh', 'zh-cn', 'zh-sg', 'zh-hans', 'zh-hans-cn', 'zh-hans-sg' ],
	},
	{
		code: 'zh_TW',
		name: '繁體中文',
		tags: [
			'zh-tw',
			'zh-hk',
			'zh-mo',
			'zh-hant',
			'zh-hant-tw',
			'zh-hant-hk',
			'zh-hant-mo',
		],
	},
	{ code: 'fr_FR', name: 'Français', tags: [ 'fr' ] },
	{ code: 'de_DE', name: 'Deutsch', tags: [ 'de' ] },
	{ code: 'it_IT', name: 'Italiano', tags: [ 'it' ] },
	{ code: 'es_ES', name: 'Español', tags: [ 'es' ] },
	{ code: 'ko_KR', name: '한국어', tags: [ 'ko' ] },
	{ code: 'ru_RU', name: 'Русский', tags: [ 'ru' ] },
	{ code: 'pt_BR', name: 'Português do Brasil', tags: [ 'pt' ] },
	{ code: 'tr_TR', name: 'Türkçe', tags: [ 'tr' ] },
	{ code: 'pl_PL', name: 'Polski', tags: [ 'pl' ] },
	{ code: 'cs_CZ', name: 'Čeština', tags: [ 'cs' ] },
] as const;

export type Locale = ( typeof LOCALES )[ number ][ 'code' ];

/**
 * Converts an OS language tag (e.g. `navigator.language`) to a WordPress
 * locale slug listed in LOCALES. A tag is looked up as is, then by its
 * primary language subtag (`ja-JP` → `ja`).
 *
 * @param tag BCP 47 language tag such as `ja-JP`.
 * @return Matching WordPress locale slug, or `undefined` when unsupported.
 */
export function toWpLocale( tag: string ): Locale | undefined {
	const find = ( t: string ) =>
		LOCALES.find( ( l ) => l.tags.some( ( x ) => x === t ) )?.code;
	const lower = tag.toLowerCase();
	return find( lower ) ?? find( lower.split( '-' )[ 0 ] );
}

type Catalog = {
	locale_data: Partial< Record< string, LocaleData< string > > >;
};

// Desktop-only strings, compiled by `pnpm i18n:make-json`. The editor package
// ships its own `mark-bricks` (+ Gutenberg `default`) catalog, so these files
// hold just the app's strings for the same `mark-bricks` domain. Every locale
// on disk is picked up, keyed by the code in its file name.
const CATALOGS: Partial< Record< string, Catalog > > = Object.fromEntries(
	Object.entries(
		import.meta.glob< Catalog >( '../languages/mark-bricks-*.json', {
			eager: true,
			import: 'default',
		} )
	).map( ( [ path, catalog ] ) => [
		path.replace( /^.*mark-bricks-(.+)\.json$/, '$1' ),
		catalog,
	] )
);

/**
 * Merges the desktop app's own translations into the `mark-bricks` domain.
 *
 * Runs after the editor's `setupEditor`, which seeds the domain. `setLocaleData`
 * merges at the message-key level, so the app strings layer on top without
 * dropping the editor's keys. English needs no catalog (msgids are English).
 *
 * @param locale Locale slug already applied by the editor's `setupEditor`.
 */
export function applyDesktopLocale( locale: string ) {
	const dict = CATALOGS[ locale ]?.locale_data?.[ TEXT_DOMAIN ];
	if ( dict ) {
		setLocaleData( dict, TEXT_DOMAIN );
	}
}
