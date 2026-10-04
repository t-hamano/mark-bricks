/**
 * Internal dependencies
 */
import { applyLocale } from './i18n';

/**
 * Applies the locale and registers the editor's blocks and formats. Hosts call
 * this once at startup, before rendering the editor.
 *
 * Registration must follow `applyLocale`, as block and format titles are
 * translated when they are registered. The block and format modules are
 * loaded only after the locale is applied, so strings they translate at
 * module load localize too.
 *
 * @param value WordPress locale slug chosen by the host (e.g. `ja`, `pt_BR`).
 * @return Applied locale slug.
 */
export async function setupEditor( value: unknown ): Promise< string > {
	const locale = applyLocale( value );
	const [ { registerBlocks }, { registerFormats } ] = await Promise.all( [
		import( './block-library' ),
		import( './format-library' ),
	] );
	registerBlocks();
	registerFormats();
	return locale;
}
