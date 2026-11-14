/**
 * WordPress dependencies
 */
import { setLocaleData, type LocaleData } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { SUPPORTED_LOCALES } from './locales';

export const TEXT_DOMAIN = 'mark-bricks';

type TextDomain = typeof TEXT_DOMAIN | 'default';
type Dictionary = LocaleData< TextDomain >;
type Dictionaries = Partial< Record< TextDomain, Dictionary > >;
type LocaleJson = { locale_data: Dictionaries };

const DEFAULT_LOCALE = 'en';

// Every compiled catalog (and committed override) on disk, keyed by path. Each
// one loads only when its locale is applied: together they weigh several
// megabytes, and a session uses one. A new locale is also added to
// SUPPORTED_LOCALES, which a test checks against these files.
const localeFiles: Partial< Record< string, () => Promise< LocaleJson > > > =
	import.meta.glob< LocaleJson >( '../languages/mark-bricks-*.json', {
		import: 'default',
	} );

const AVAILABLE_LOCALES: ReadonlySet< string > = new Set( SUPPORTED_LOCALES );

// The domains the catalogs hold: the editor's strings, and Gutenberg's.
const ALL_DOMAINS: readonly TextDomain[] = [ TEXT_DOMAIN, 'default' ];

/**
 * Merges app + Gutenberg + optional override dictionaries for the locale.
 * Sources merge at the msgid level; `mark-bricks-override-{code}.json` can
 * override either the `mark-bricks` or `default` (Gutenberg) domain.
 *
 * @param code WordPress locale slug.
 */
async function getDictionaries( code: string ) {
	const result: Dictionaries = {
		[ TEXT_DOMAIN ]: { '': { domain: TEXT_DOMAIN, lang: code } },
	};
	const sources = await Promise.all(
		[
			localeFiles[ `../languages/mark-bricks-${ code }.json` ],
			localeFiles[ `../languages/mark-bricks-override-${ code }.json` ],
		].map( ( load ) => load?.() )
	);
	for ( const source of sources ) {
		if ( ! source ) {
			continue;
		}
		for ( const [ key, dict ] of Object.entries( source.locale_data ) ) {
			if ( ! dict ) {
				continue;
			}
			const domain = key as TextDomain;
			result[ domain ] = { ...result[ domain ], ...dict };
		}
	}
	return result;
}

/**
 * Resolves any value to a WordPress locale slug: a slug with a catalog as-is,
 * else DEFAULT_LOCALE.
 *
 * @param value Unverified input (a WordPress locale slug such as `ja`).
 * @return Resolved locale slug.
 */
export function resolveLocale( value: unknown ): string {
	return typeof value === 'string' && AVAILABLE_LOCALES.has( value )
		? value
		: DEFAULT_LOCALE;
}

/**
 * Applies the dictionaries for a WordPress locale slug to `@wordpress/i18n`,
 * falling back to English when the editor has no catalog for it. Returns the
 * applied slug so callers can use it for further state (e.g. render in UI).
 *
 * @param value WordPress locale slug chosen by the host (e.g. `ja`, `pt_BR`).
 * @return Applied locale slug.
 */
export async function applyLocale( value: unknown ): Promise< string > {
	const lang = resolveLocale( value );
	const dicts = await getDictionaries( lang );
	for ( const domain of ALL_DOMAINS ) {
		const dict: Dictionary = dicts[ domain ] ?? {
			'': { domain, lang },
		};
		setLocaleData( dict, domain );
	}
	return lang;
}
