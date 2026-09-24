/**
 * WordPress dependencies
 */
import { setLocaleData, type LocaleData } from '@wordpress/i18n';

/**
 * External dependencies
 */
import { type Locale } from '@mark-bricks/editor';

const TEXT_DOMAIN = 'mark-bricks';

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
 * Runs after the editor's `applyLocale`, which seeds the domain. `setLocaleData`
 * merges at the message-key level, so the app strings layer on top without
 * dropping the editor's keys. English needs no catalog (msgids are English).
 *
 * @param locale Locale already resolved by the editor's `applyLocale`.
 */
export function applyDesktopLocale( locale: Locale ) {
	const dict = CATALOGS[ locale ]?.locale_data?.[ TEXT_DOMAIN ];
	if ( dict ) {
		setLocaleData( dict, TEXT_DOMAIN );
	}
}
