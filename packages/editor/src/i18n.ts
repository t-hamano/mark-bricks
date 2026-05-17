/**
 * WordPress dependencies
 */
import { getLocaleData, setLocaleData, type LocaleData } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import jaDict from '../languages/mark-bricks-ja.json';

const TEXT_DOMAIN = 'mark-bricks';

export const LOCALES = [
	{
		code: 'en',
		name: 'English',
		matches: ( tag: string ) => tag.startsWith( 'en' ),
	},
	{
		code: 'ja',
		name: '日本語',
		matches: ( tag: string ) => tag.startsWith( 'ja' ),
	},
] as const;

export type Locale = ( typeof LOCALES )[ number ][ 'code' ];
type TextDomain = typeof TEXT_DOMAIN | 'default';
type Dictionary = LocaleData< TextDomain >;
type Dictionaries = Partial< Record< TextDomain, Dictionary > >;
type LocaleJson = { locale_data: Dictionaries };

const DEFAULT_LOCALE: Locale = LOCALES[ 0 ].code;

const localeFiles: Partial< Record< string, LocaleJson > > = {
	'../languages/mark-bricks-ja.json': jaDict as LocaleJson,
};

const ALL_DOMAINS: ReadonlySet< TextDomain > = new Set(
	LOCALES.flatMap(
		( l ) => Object.keys( getDictionaries( l.code ) ) as TextDomain[]
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
 * Resolves any value to a Locale: known LOCALES code as-is, else falls back
 * to `navigator.language` detection, then DEFAULT_LOCALE.
 *
 * @param value Unverified input (persisted setting, user choice, etc.).
 * @return Resolved Locale.
 */
function resolveLocale( value: unknown ): Locale {
	if ( typeof value === 'string' ) {
		const match = LOCALES.find( ( l ) => l.code === value );
		if ( match ) {
			return match.code;
		}
	}
	const tag = navigator.language.toLowerCase();
	return LOCALES.find( ( l ) => l.matches( tag ) )?.code ?? DEFAULT_LOCALE;
}

/**
 * Resolves any value to a Locale and applies its dictionaries to
 * `@wordpress/i18n`. Returns the resolved Locale so callers can use it
 * for further state (e.g. persist to settings, render in UI).
 *
 * @param value Unverified input (persisted setting, user choice, etc.).
 * @return Resolved and applied Locale.
 */
export function applyLocale( value: unknown ): Locale {
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
 * @return Currently active Locale.
 */
export function getLocale(): Locale {
	const meta = getLocaleData( TEXT_DOMAIN )?.[ '' ];
	const lang = meta && ! Array.isArray( meta ) ? meta.lang : undefined;
	return resolveLocale( lang );
}
