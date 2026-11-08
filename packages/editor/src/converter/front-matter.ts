// `---` fences at the start of the document, optionally after a UTF-8
// BOM. The content may be empty.
const FRONT_MATTER_PATTERN =
	/^\uFEFF?---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)/;

// A top-level `marp: true`, optionally followed by a YAML comment.
const MARP_DIRECTIVE_PATTERN = /^marp[ \t]*:[ \t]+true[ \t]*(?:#.*)?$/m;

// Any top-level `marp` key, whatever its value.
const MARP_KEY_PATTERN = /^marp[ \t]*:/;

function escapeRegExp( text: string ): string {
	return text.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
}

// A top-level `key: value` line. The value excludes a trailing comment.
function keyLinePattern( key: string ): RegExp {
	return new RegExp(
		`^${ escapeRegExp( key ) }[ \\t]*:(?:[ \\t]+(.*?))?[ \\t]*(?:[ \\t]#.*)?$`
	);
}

export type SplitFrontMatterResult = {
	// `null` when the document has no front matter.
	frontMatter: string | null;
	body: string;
};

/**
 * Splits leading YAML front matter off a Markdown document, since
 * remark-parse would read its fences as a thematic break and a heading.
 *
 * @param markdown Markdown document, possibly starting with front matter.
 * @return The front matter content and the remaining body.
 */
export function splitFrontMatter( markdown: string ): SplitFrontMatterResult {
	const match = FRONT_MATTER_PATTERN.exec( markdown );
	if ( ! match ) {
		return { frontMatter: null, body: markdown };
	}
	return {
		frontMatter: ( match[ 1 ] ?? '' ).replace( /\r\n?/g, '\n' ),
		body: markdown.slice( match[ 0 ].length ),
	};
}

/**
 * Prepends YAML front matter to a Markdown body. Inverse of
 * {@link splitFrontMatter}.
 *
 * @param frontMatter YAML content, or `null` to leave the body as it is.
 * @param body        Markdown body.
 * @return The Markdown document.
 */
export function joinFrontMatter(
	frontMatter: string | null,
	body: string
): string {
	if ( frontMatter === null ) {
		return body;
	}
	const block =
		frontMatter === '' ? '---\n---\n' : `---\n${ frontMatter }\n---\n`;
	return body === '' ? block : `${ block }\n${ body }`;
}

/**
 * Whether front matter makes the document a Marp slide deck, which it does
 * when it contains `marp: true`.
 *
 * @param frontMatter Front matter content, or `null` when there is none.
 * @return Whether the document is a Marp slide deck.
 */
export function isMarpFrontMatter( frontMatter: string | null ): boolean {
	return frontMatter !== null && MARP_DIRECTIVE_PATTERN.test( frontMatter );
}

/**
 * Turns Marp on or off in front matter. Turning it on writes `marp: true`
 * as the first line; turning it off removes every top-level `marp` line.
 *
 * @param frontMatter Front matter content.
 * @param enabled     Whether the document should be a Marp slide deck.
 * @return The updated front matter content.
 */
export function setMarpFrontMatter(
	frontMatter: string,
	enabled: boolean
): string {
	if ( enabled && isMarpFrontMatter( frontMatter ) ) {
		return frontMatter;
	}
	const lines = frontMatter
		.split( '\n' )
		.filter( ( line ) => ! MARP_KEY_PATTERN.test( line ) );
	const rest = lines.join( '\n' );
	if ( ! enabled ) {
		return rest;
	}
	return rest === '' ? 'marp: true' : `marp: true\n${ rest }`;
}

/**
 * Whether a Markdown document is a Marp slide deck, which it is when its
 * front matter contains `marp: true`.
 *
 * @param markdown Markdown document.
 * @return Whether the document is a Marp slide deck.
 */
export function isMarpDocument( markdown: string ): boolean {
	return isMarpFrontMatter( splitFrontMatter( markdown ).frontMatter );
}

/**
 * Reads a top-level scalar value from front matter, without its quotes or
 * a trailing comment.
 *
 * @param frontMatter Front matter content, or `null` when there is none.
 * @param key         Top-level key.
 * @return The value, or `null` when the key is missing or empty.
 */
export function getFrontMatterValue(
	frontMatter: string | null,
	key: string
): string | null {
	if ( frontMatter === null ) {
		return null;
	}
	const pattern = keyLinePattern( key );
	for ( const line of frontMatter.split( '\n' ) ) {
		const match = pattern.exec( line );
		if ( match ) {
			const value = ( match[ 1 ] ?? '' ).replace(
				/^(["'])(.*)\1$/,
				'$2'
			);
			return value === '' ? null : value;
		}
	}
	return null;
}

/**
 * Writes a top-level scalar value into front matter. An existing line for
 * the key is replaced in place; otherwise the line goes right after the
 * `marp` line, or at the end when there is none.
 *
 * @param frontMatter Front matter content.
 * @param key         Top-level key.
 * @param value       New value, or `null` to remove the key.
 * @return The updated front matter content.
 */
export function setFrontMatterValue(
	frontMatter: string,
	key: string,
	value: string | null
): string {
	const keyPattern = new RegExp( `^${ escapeRegExp( key ) }[ \\t]*:` );
	let replaced = false;
	const lines = (
		frontMatter === '' ? [] : frontMatter.split( '\n' )
	).flatMap( ( line ) => {
		if ( ! keyPattern.test( line ) ) {
			return [ line ];
		}
		if ( replaced || value === null ) {
			return [];
		}
		replaced = true;
		const comment = line.match( /[ \t]#.*$/ )?.[ 0 ] ?? '';
		return [ `${ key }: ${ value }${ comment }` ];
	} );
	if ( ! replaced && value !== null ) {
		const marpIndex = lines.findIndex( ( line ) =>
			MARP_KEY_PATTERN.test( line )
		);
		lines.splice(
			marpIndex === -1 ? lines.length : marpIndex + 1,
			0,
			`${ key }: ${ value }`
		);
	}
	return lines.join( '\n' );
}
