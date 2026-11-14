/**
 * External dependencies
 */
import { isMap, isNode, isScalar, parseDocument } from 'yaml';

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

export type Scalar = {
	value: string;
	// A trailing YAML comment with its leading space, or `''`.
	comment: string;
};

function readComment( rest: string ): string {
	const match = /^[ \t]*(#.*)?$/.exec( rest );
	return match?.[ 1 ] ? ` ${ match[ 1 ] }` : '';
}

// Reads a one-line YAML scalar: plain, single-quoted or double-quoted.
export function parseScalar( raw: string ): Scalar {
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
export function formatScalar( value: string ): string {
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

type KeyRange = {
	// Lines the key and its value span, or `null` when the key is missing.
	lines: { start: number; end: number } | null;
	// The value as YAML reads it, or `null` when the key is missing or holds
	// something other than a string.
	value: string | null;
	// Whether the editor can rewrite the value. It can't when the front
	// matter isn't valid YAML, or when the value is more than a plain string,
	// such as one with an anchor or a tag, an alias or a collection,
	// because rewriting it would lose its meaning.
	editable: boolean;
};

const NOT_EDITABLE: KeyRange = { lines: null, value: null, editable: false };

// Index of the line holding a character offset.
function lineAt( text: string, offset: number ): number {
	return text.slice( 0, offset ).split( '\n' ).length - 1;
}

// Finds a top-level key with a YAML parser, so that every way of writing
// the key and its value reads as YAML would read it.
function findKeyRange( frontMatter: string, key: string ): KeyRange {
	const doc = parseDocument( frontMatter );
	if ( doc.errors.length > 0 ) {
		return NOT_EDITABLE;
	}
	if ( doc.contents === null ) {
		return { lines: null, value: null, editable: true };
	}
	if ( ! isMap( doc.contents ) || doc.contents.flow ) {
		return NOT_EDITABLE;
	}
	const pair = doc.contents.items.find(
		( item ) => isScalar( item.key ) && item.key.value === key
	);
	if ( ! pair || ! isScalar( pair.key ) || ! pair.key.range ) {
		return { lines: null, value: null, editable: true };
	}
	// Rewriting the key line would drop an anchor or a tag on the key.
	if ( pair.key.anchor || pair.key.tag ) {
		return NOT_EDITABLE;
	}
	const node = pair.value;
	const nodeEnd = isNode( node ) && node.range ? node.range[ 2 ] : null;
	const end = nodeEnd ?? pair.key.range[ 2 ];
	const lines = {
		start: lineAt( frontMatter, pair.key.range[ 0 ] ),
		end:
			lineAt(
				frontMatter,
				frontMatter.slice( 0, end ).replace( /\s+$/, '' ).length
			) + 1,
	};
	if ( node === null || ( isScalar( node ) && node.value === null ) ) {
		return {
			lines,
			value: null,
			editable: ! isNode( node ) || ( ! node.tag && ! node.anchor ),
		};
	}
	const editable =
		isScalar( node ) &&
		typeof node.value === 'string' &&
		! node.anchor &&
		! node.tag;
	return {
		lines,
		value: editable ? ( node.value as string ).replace( /\n+$/, '' ) : null,
		editable,
	};
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
	const { value } = findKeyRange( frontMatter, key );
	return value !== null && value.trim() !== '' ? value : null;
}

/**
 * Whether {@link setFrontMatterBlockValue} can rewrite a top-level value.
 * It can't when the value uses YAML features beyond a plain string, such
 * as an anchor, a tag, an alias or a collection.
 *
 * @param frontMatter Front matter content, or `null` when there is none.
 * @param key         Top-level key.
 * @return Whether the value can be rewritten, which a missing key can.
 */
export function isFrontMatterBlockValueEditable(
	frontMatter: string | null,
	key: string
): boolean {
	if ( frontMatter === null ) {
		return true;
	}
	return findKeyRange( frontMatter, key ).editable;
}

/**
 * Writes a top-level value into front matter as a literal block scalar
 * (`key: |`), replacing the key's existing lines in place or adding it at
 * the end. A value that {@link isFrontMatterBlockValueEditable} rejects is
 * left as it is.
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
	const range = findKeyRange( frontMatter, key );
	if ( ! range.editable ) {
		return frontMatter;
	}
	const lines = frontMatter === '' ? [] : frontMatter.split( '\n' );
	const valueLines =
		value === null ? [] : value.replace( /\s+$/, '' ).split( '\n' );
	// YAML infers a block's indentation from its first non-empty line, so a
	// value starting with spaces needs an explicit indentation indicator.
	const firstLine = valueLines.find( ( line ) => line !== '' ) ?? '';
	const header = /^\s/.test( firstLine ) ? `${ key }: |2` : `${ key }: |`;
	const next =
		value === null || value.trim() === ''
			? []
			: [
					header,
					...valueLines.map( ( line ) =>
						line === '' ? '' : `  ${ line }`
					),
				];
	if ( range.lines ) {
		lines.splice(
			range.lines.start,
			range.lines.end - range.lines.start,
			...next
		);
	} else {
		// A new key goes before a document-end marker (`...`), since YAML
		// and Marp ignore whatever follows it.
		const docEnd = lines.findIndex( ( line ) =>
			/^\.\.\.(\s|$)/.test( line )
		);
		lines.splice( docEnd === -1 ? lines.length : docEnd, 0, ...next );
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
