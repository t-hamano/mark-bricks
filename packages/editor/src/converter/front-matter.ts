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

// A top-level `key:` line, capturing what follows the colon.
function keyLinePattern( key: string ): RegExp {
	return new RegExp( `^${ escapeRegExp( key ) }[ \\t]*:(?=[ \\t]|$)(.*)$` );
}

type Scalar = {
	value: string;
	// A trailing YAML comment with its leading space, or `''`.
	comment: string;
};

function readComment( rest: string ): string {
	const match = /^[ \t]*(#.*)?$/.exec( rest );
	return match?.[ 1 ] ? ` ${ match[ 1 ] }` : '';
}

// Reads a one-line YAML scalar: plain, single-quoted or double-quoted.
function parseScalar( raw: string ): Scalar {
	const text = raw.replace( /^[ \t]+/, '' );
	const doubleQuoted = /^"((?:[^"\\]|\\.)*)"(.*)$/.exec( text );
	if ( doubleQuoted ) {
		let value: string;
		try {
			value = JSON.parse( `"${ doubleQuoted[ 1 ] }"` );
		} catch {
			value = doubleQuoted[ 1 ].replace( /\\(.)/g, '$1' );
		}
		return { value, comment: readComment( doubleQuoted[ 2 ] ) };
	}
	const singleQuoted = /^'((?:[^']|'')*)'(.*)$/.exec( text );
	if ( singleQuoted ) {
		return {
			value: singleQuoted[ 1 ].replace( /''/g, "'" ),
			comment: readComment( singleQuoted[ 2 ] ),
		};
	}
	if ( text.startsWith( '#' ) ) {
		return { value: '', comment: ` ${ text }` };
	}
	const plain = /^([\s\S]*?)(?:[ \t]+(#.*))?$/.exec( text );
	return {
		value: ( plain?.[ 1 ] ?? '' ).trim(),
		comment: plain?.[ 2 ] ? ` ${ plain[ 2 ] }` : '',
	};
}

// Writes a string as a YAML scalar, quoting it only when a plain scalar
// would read back differently.
function formatScalar( value: string ): string {
	const needsQuotes =
		value === '' ||
		/^\s|\s$/.test( value ) ||
		/^[-?:,[\]{}#&*!|>'"%@`]/.test( value ) ||
		/:(?:[ \t]|$)/.test( value ) ||
		/[ \t]#/.test( value ) ||
		/[\r\n\t]/.test( value );
	return needsQuotes ? JSON.stringify( value ) : value;
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
			const { value } = parseScalar( match[ 1 ] );
			return value === '' ? null : value;
		}
	}
	return null;
}

// A block scalar indicator such as `|`, `|-` or `>2`, optionally followed
// by a YAML comment.
const BLOCK_INDICATOR_PATTERN = /^[ \t]*[|>][1-9+-]{0,2}[ \t]*(?:#.*)?$/;

type KeyRange = {
	start: number;
	// Index after the last line belonging to the key.
	end: number;
	// The value, without the key or a trailing comment.
	value: string;
};

// Finds a top-level key and the lines its value spans, reading a block
// scalar (`|`, `>`) as its indented lines with the indentation removed.
function findKeyRange( lines: string[], key: string ): KeyRange | null {
	const pattern = keyLinePattern( key );
	const start = lines.findIndex( ( line ) => pattern.test( line ) );
	if ( start === -1 ) {
		return null;
	}
	const rest = pattern.exec( lines[ start ] )?.[ 1 ] ?? '';
	// Every indented line after the key continues its value, whether the
	// value is a block scalar or a quoted or plain one spanning lines.
	let end = start + 1;
	while (
		end < lines.length &&
		( lines[ end ].trim() === '' || /^[ \t]/.test( lines[ end ] ) )
	) {
		end++;
	}
	// Trailing blank lines belong to whatever follows.
	while ( end > start + 1 && lines[ end - 1 ].trim() === '' ) {
		end--;
	}
	const content = lines.slice( start + 1, end );
	if ( ! BLOCK_INDICATOR_PATTERN.test( rest ) ) {
		// YAML folds a flow scalar's line breaks into spaces, and a blank
		// line into a line break.
		const folded = [ rest, ...content ]
			.map( ( line ) => line.trim() )
			.reduce( ( text, line ) => {
				if ( line === '' ) {
					return `${ text }\n`;
				}
				return text === '' || text.endsWith( '\n' )
					? `${ text }${ line }`
					: `${ text } ${ line }`;
			}, '' );
		return { start, end, value: parseScalar( folded ).value };
	}
	const indent = Math.min(
		...content
			.filter( ( line ) => line.trim() !== '' )
			.map( ( line ) => /^[ \t]*/.exec( line )?.[ 0 ].length ?? 0 )
	);
	const unindented = content.map( ( line ) =>
		line.trim() === '' ? '' : line.slice( indent )
	);
	return {
		start,
		end,
		value: /^[ \t]*>/.test( rest )
			? foldLines( unindented )
			: unindented.join( '\n' ),
	};
}

// Joins the lines of a folded block scalar (`>`) the way YAML does: a line
// break between two lines of text becomes a space, while blank lines and
// more indented lines keep their line breaks.
function foldLines( lines: string[] ): string {
	let text = '';
	lines.forEach( ( line, index ) => {
		if ( index === 0 ) {
			text = line;
			return;
		}
		const previous = lines[ index - 1 ];
		const isText = ( item: string ) =>
			item !== '' && ! /^[ \t]/.test( item );
		const separator = isText( previous ) && isText( line ) ? ' ' : '\n';
		// A blank line between two lines of text stands for the break that
		// folding removed, so it adds nothing more.
		if (
			line === '' &&
			isText( previous ) &&
			isText(
				lines.slice( index + 1 ).find( ( item ) => item !== '' ) ?? ''
			)
		) {
			return;
		}
		text += `${ separator }${ line }`;
	} );
	return text;
}

/**
 * Reads a top-level value from front matter that may span several lines,
 * such as `style: |` followed by indented CSS. A one-line value is read
 * like {@link getFrontMatterValue}.
 *
 * @param frontMatter Front matter content, or `null` when there is none.
 * @param key         Top-level key.
 * @return The value, or `null` when the key is missing or empty.
 */
export function getFrontMatterBlockValue(
	frontMatter: string | null,
	key: string
): string | null {
	if ( frontMatter === null ) {
		return null;
	}
	const range = findKeyRange( frontMatter.split( '\n' ), key );
	return range && range.value.trim() !== '' ? range.value : null;
}

/**
 * Writes a top-level value into front matter as a literal block scalar
 * (`key: |`), replacing the key's existing lines in place or adding it at
 * the end.
 *
 * @param frontMatter Front matter content.
 * @param key         Top-level key.
 * @param value       New value, or `null` to remove the key.
 * @return The updated front matter content.
 */
export function setFrontMatterBlockValue(
	frontMatter: string,
	key: string,
	value: string | null
): string {
	const lines = frontMatter === '' ? [] : frontMatter.split( '\n' );
	const range = findKeyRange( lines, key );
	const next =
		value === null || value.trim() === ''
			? []
			: [
					`${ key }: |`,
					...value
						.replace( /\s+$/, '' )
						.split( '\n' )
						.map( ( line ) =>
							line === '' ? '' : `  ${ line }`
						),
				];
	if ( range ) {
		lines.splice( range.start, range.end - range.start, ...next );
	} else {
		lines.push( ...next );
	}
	return lines.join( '\n' );
}

/**
 * Writes a top-level scalar value into front matter, quoting it when
 * needed. An existing line for the key is replaced in place, keeping its
 * comment; otherwise the line goes right after the `marp` line, or at the
 * end when there is none.
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
	const pattern = keyLinePattern( key );
	const formatted = value === null ? null : formatScalar( value );
	let replaced = false;
	const lines = (
		frontMatter === '' ? [] : frontMatter.split( '\n' )
	).flatMap( ( line ) => {
		const match = pattern.exec( line );
		if ( ! match ) {
			return [ line ];
		}
		if ( replaced || formatted === null ) {
			return [];
		}
		replaced = true;
		const { comment } = parseScalar( match[ 1 ] );
		return [ `${ key }: ${ formatted }${ comment }` ];
	} );
	if ( ! replaced && formatted !== null ) {
		const marpIndex = lines.findIndex( ( line ) =>
			MARP_KEY_PATTERN.test( line )
		);
		lines.splice(
			marpIndex === -1 ? lines.length : marpIndex + 1,
			0,
			`${ key }: ${ formatted }`
		);
	}
	return lines.join( '\n' );
}
