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

// A line that YAML front matter can hold: a top-level `key:` (with no
// spaces in the key), an indented line, a list item or a comment.
const YAML_LINE_PATTERN =
	/^(?:[A-Za-z_$][\w$.-]*[ \t]*:(?:[ \t]|$)|[ \t]|- |#)/;

function looksLikeYaml( content: string ): boolean {
	const lines = content.split( /\r?\n/ );
	return (
		/^[A-Za-z_$][\w$.-]*[ \t]*:/.test( lines[ 0 ] ) &&
		lines.every(
			( line ) => line.trim() === '' || YAML_LINE_PATTERN.test( line )
		)
	);
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
