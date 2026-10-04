/**
 * WordPress dependencies
 */
import { getLocaleData } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { resolveLocale, TEXT_DOMAIN } from './i18n';

/**
 * Reads the locale currently applied to `@wordpress/i18n`. The locale is set
 * once at startup by `setupEditor`, so this value is stable for the session.
 *
 * @return Currently active locale slug.
 */
export function getLocale(): string {
	const meta = getLocaleData( TEXT_DOMAIN )?.[ '' ];
	const lang = meta && ! Array.isArray( meta ) ? meta.lang : undefined;
	return resolveLocale( lang );
}
