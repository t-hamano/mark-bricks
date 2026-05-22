/**
 * WordPress dependencies
 */
import { setLocaleData, type LocaleData } from '@wordpress/i18n';

/**
 * External dependencies
 */
import { type Locale } from '@mark-bricks/editor';

/**
 * Internal dependencies
 */
import jaCatalog from '../languages/mark-bricks-ja.json';

const TEXT_DOMAIN = 'mark-bricks';

type Catalog = {
	locale_data: Partial< Record< string, LocaleData< string > > >;
};

// Desktop-only strings, compiled by `pnpm i18n:make-json`. The editor package
// ships its own `mark-bricks` (+ Gutenberg `default`) catalog, so these files
// hold just the app's strings for the same `mark-bricks` domain.
const CATALOGS: Partial< Record< Locale, Catalog > > = {
	ja: jaCatalog as Catalog,
};

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
