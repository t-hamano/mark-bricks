/**
 * Internal dependencies
 */
import { joinFrontMatter } from '../converter';

export type AiFrontMatterResult = {
	// `null` when the Markdown does not start with front matter.
	frontMatter: string | null;
	body: string;
};

// Front matter, also as models sometimes write it: with blank lines after
// the opening fence or before the closing one, and a closing line of more
// than three dashes.
const LOOSE_FRONT_MATTER_PATTERN =
	/^---[ \t]*\r?\n(?:[ \t]*\r?\n)*([\s\S]*?)(?:\r?\n[ \t]*)*\r?\n-{3,}[ \t]*(?:\r?\n|$)/;

const LEADING_BLANK_LINES = /^(?:[ \t]*\r?\n)+/;

// A top-level `key: value` line. Front matter keys, such as Marp's
// directives, start with a lower-case letter, which tells them apart from
// prose such as `Note: …`.
const KEY_LINE_PATTERN = /^[a-z_$][\w$.-]*[ \t]*:(?:[ \t]+(.*))?$/;

/**
 * Whether the text between the fences reads as YAML front matter rather
 * than slide content: top-level `key:` lines, and, only under a key with
 * no value or a block scalar (`|`, `>`), indented lines and list items.
 * Blank lines are allowed only inside such nested content.
 *
 * @param content Text between the fences.
 * @return Whether it is front matter.
 */
function looksLikeYaml( content: string ): boolean {
	const lines = content.split( /\r?\n/ );
	let canNest = false;
	let isNested = false;
	for ( const line of lines ) {
		if ( /^[ \t]*#/.test( line ) ) {
			continue;
		}
		if ( line.trim() === '' ) {
			if ( ! isNested ) {
				return false;
			}
			continue;
		}
		if ( /^[ \t]/.test( line ) || /^- /.test( line ) ) {
			if ( ! canNest ) {
				return false;
			}
			isNested = true;
			continue;
		}
		const match = KEY_LINE_PATTERN.exec( line );
		if ( ! match ) {
			return false;
		}
		const value = ( match[ 1 ] ?? '' ).replace( /[ \t]+#.*$/, '' ).trim();
		canNest = value === '' || /^[|>][-+]?\d*$/.test( value );
		isNested = false;
	}
	return KEY_LINE_PATTERN.test( lines[ 0 ] );
}

/**
 * Splits leading front matter off Markdown written by the model. Besides
 * well-formed front matter, it accepts the malformed fences models
 * sometimes write, which would otherwise turn into a separator and a
 * heading.
 *
 * @param markdown Markdown written by the model.
 * @return The front matter content and the remaining body.
 */
export function splitAiFrontMatter( markdown: string ): AiFrontMatterResult {
	const text = markdown.replace( LEADING_BLANK_LINES, '' );
	const loose = LOOSE_FRONT_MATTER_PATTERN.exec( text );
	if ( ! loose || ! looksLikeYaml( loose[ 1 ] ) ) {
		return { frontMatter: null, body: markdown };
	}
	return {
		frontMatter: loose[ 1 ].replace( /\r\n?/g, '\n' ),
		body: text
			.slice( loose[ 0 ].length )
			.replace( LEADING_BLANK_LINES, '' ),
	};
}

/**
 * Rewrites leading front matter in Markdown written by the model into
 * the well-formed shape, leaving the rest as it is.
 *
 * @param markdown Markdown written by the model.
 * @return The Markdown with well-formed front matter.
 */
export function normalizeAiFrontMatter( markdown: string ): string {
	const { frontMatter, body } = splitAiFrontMatter( markdown );
	return frontMatter === null
		? markdown
		: joinFrontMatter( frontMatter, body );
}
