/**
 * WordPress dependencies
 */
import { setLocaleData, type LocaleData } from '@wordpress/i18n';

const TEXT_DOMAIN = 'mark-bricks';

type Catalog = {
	locale_data: Partial< Record< string, LocaleData< string > > >;
};

// The preview pages' strings, compiled by `pnpm i18n:make-json`. Every locale
// on disk is picked up, keyed by the code in its file name.
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
 * Applies the translations for a WordPress locale slug to `@wordpress/i18n`.
 * A preview page calls it before `createSlidePreview`. English needs no
 * catalog (msgids are English), nor does a locale without one, which stays in
 * English.
 *
 * @param locale WordPress locale slug chosen by the host (e.g. `ja`, `pt_BR`).
 */
export function applyLocale( locale: string ) {
	const dict = CATALOGS[ locale ]?.locale_data?.[ TEXT_DOMAIN ];
	if ( dict ) {
		setLocaleData( dict, TEXT_DOMAIN );
	}
}
