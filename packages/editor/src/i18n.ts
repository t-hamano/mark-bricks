/**
 * WordPress dependencies
 */
import { getLocaleData, setLocaleData, type LocaleData } from '@wordpress/i18n';

const TEXT_DOMAIN = 'mark-bricks';

type TextDomain = typeof TEXT_DOMAIN | 'default';
type Dictionary = LocaleData< TextDomain >;
type Dictionaries = Partial< Record< TextDomain, Dictionary > >;
type LocaleJson = { locale_data: Dictionaries };

const DEFAULT_LOCALE = 'en';

// Every compiled catalog (and committed override) on disk, keyed by path, so a
// new locale's JSON is picked up without listing it here.
const localeFiles: Partial< Record< string, LocaleJson > > = import.meta.glob(
	'../languages/mark-bricks-*.json',
	{ eager: true, import: 'default' }
);

// WordPress locale slugs that have a catalog. Hosts map their own language
// settings to these slugs.
const AVAILABLE_LOCALES: ReadonlySet< string > = new Set( [
	DEFAULT_LOCALE,
	...Object.keys( localeFiles ).flatMap( ( path ) => {
		const match = path.match( /\/mark-bricks-(?!override-)(.+)\.json$/ );
		return match ? [ match[ 1 ] ] : [];
	} ),
] );

const ALL_DOMAINS: ReadonlySet< TextDomain > = new Set(
	[ ...AVAILABLE_LOCALES ].flatMap(
		( code ) => Object.keys( getDictionaries( code ) ) as TextDomain[]
	)
);

/**
 * Merges app + Gutenberg + optional override dictionaries for the locale.
 * Sources merge at the msgid level; `mark-bricks-override-{code}.json` can
 * override either the `mark-bricks` or `default` (Gutenberg) domain.
 *
 * @param code
 */
function getDictionaries( code: string ) {
	const result: Dictionaries = {
		[ TEXT_DOMAIN ]: { '': { domain: TEXT_DOMAIN, lang: code } },
	};
	const sources = [
		localeFiles[ `../languages/mark-bricks-${ code }.json` ],
		localeFiles[ `../languages/mark-bricks-override-${ code }.json` ],
	];
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
function resolveLocale( value: unknown ): string {
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
export function applyLocale( value: unknown ): string {
	const lang = resolveLocale( value );
	const dicts = getDictionaries( lang );
	for ( const domain of ALL_DOMAINS ) {
		const dict: Dictionary = dicts[ domain ] ?? {
			'': { domain, lang },
		};
		setLocaleData( dict, domain );
	}
	return lang;
}

/**
 * Reads the locale currently applied to `@wordpress/i18n`. The locale is set
 * once at startup by `applyLocale`, so this value is stable for the session.
 *
 * @return Currently active locale slug.
 */
export function getLocale(): string {
	const meta = getLocaleData( TEXT_DOMAIN )?.[ '' ];
	const lang = meta && ! Array.isArray( meta ) ? meta.lang : undefined;
	return resolveLocale( lang );
}
