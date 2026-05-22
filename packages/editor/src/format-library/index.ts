/**
 * WordPress dependencies
 */
import { registerFormatType } from '@wordpress/rich-text';

/**
 * Internal dependencies
 */
import { bold } from './bold';
import { clearFormatting } from './clear-formatting';
import { code } from './code';
import { italic } from './italic';
import { link } from './link';
import { strikethrough } from './strikethrough';

const formats = [ bold, italic, code, strikethrough, link, clearFormatting ];

// `title` is a function so it resolves against the active locale at
// registration time (called via the Editor's lazy registration, after the
// host applies the locale) rather than being frozen at module load.
export function registerFormats() {
	formats.forEach( ( { name, title, ...settings } ) =>
		registerFormatType( name, {
			...settings,
			title: title(),
		} as unknown as Parameters< typeof registerFormatType >[ 1 ] )
	);
}
