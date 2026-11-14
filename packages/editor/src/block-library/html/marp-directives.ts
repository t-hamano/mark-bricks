/**
 * Internal dependencies
 */
import { formatScalar, parseScalar } from '../../converter/front-matter';

/**
 * The Marp local directives that the slide settings edit, in the order they
 * are written.
 */
export const MARP_DIRECTIVES = [
	'class',
	'paginate',
	'header',
	'footer',
	'backgroundColor',
	'color',
	'backgroundImage',
] as const;

export type MarpDirectiveName = ( typeof MARP_DIRECTIVES )[ number ];

/**
 * The values of the slide settings. A missing key is not written, and an
 * empty one is written as an empty string.
 */
export type MarpDirectiveValues = Partial<
	Record< MarpDirectiveName, string >
>;

/**
 * The directives of an HTML comment, split from the other lines it holds.
 */
export interface MarpDirectiveComment {
	values: MarpDirectiveValues;
	/**
	 * Whether the directives apply to this slide only: written with a leading
	 * underscore, such as `_class`. Without it, they apply to the following
	 * slides as well.
	 */
	isSpot: boolean;
	/** Lines of the comment that the settings do not edit, kept as written. */
	otherLines: string[];
	/**
	 * The values as written, with their quotes, such as `''`. A value that
	 * did not change is written back this way, so its quotes are kept.
	 */
	rawValues?: MarpDirectiveValues;
	/**
	 * Whether each directive was written for this slide only. A comment can
	 * mix both scopes, so each directive keeps its own until `isSpot` is
	 * chosen for all of them.
	 */
	spotDirectives?: Partial< Record< MarpDirectiveName, boolean > >;
}

/**
 * Where a directive comment sits in the HTML, and what it holds.
 */
export interface FoundMarpDirectiveComment extends MarpDirectiveComment {
	start: number;
	end: number;
}

/**
 * The classes that Marp's built-in themes provide.
 * https://github.com/marp-team/marp-core/tree/main/themes
 */
export const MARP_THEME_CLASSES: Record< string, string[] > = {
	default: [ 'invert' ],
	gaia: [ 'lead', 'invert', 'gaia' ],
	uncover: [ 'invert' ],
};

const COMMENT_PATTERN = /<!--([\s\S]*?)-->/g;
const LINE_PATTERN = /^[ \t]*(_?)([A-Za-z][\w-]*)[ \t]*:(?=[ \t]|$)(.*)$/;

function isDirectiveName( name: string ): name is MarpDirectiveName {
	return ( MARP_DIRECTIVES as readonly string[] ).includes( name );
}

/**
 * Splits YAML into its top-level entries. A line indented more than the first
 * one continues the entry before it, as in a multi-line value such as
 * `_header: |`, and is kept with it as written.
 *
 * @param body The YAML.
 * @return The entries, each with its first line trimmed.
 */
function groupYamlLines( body: string ): string[] {
	const lines = body.split( /\r?\n/ );
	const indent = ( line: string ) => /^[ \t]*/.exec( line )![ 0 ].length;
	const first = lines.find( ( line ) => line.trim() );
	const baseIndent = first ? indent( first ) : 0;
	const entries: string[] = [];
	// Blank lines are kept only inside a multi-line value.
	let blankLines = '';
	for ( const line of lines ) {
		if ( ! line.trim() ) {
			blankLines += `\n${ line }`;
		} else if ( entries.length && indent( line ) > baseIndent ) {
			entries[ entries.length - 1 ] += `${ blankLines }\n${ line }`;
			blankLines = '';
		} else {
			entries.push( line.trim() );
			blankLines = '';
		}
	}
	return entries;
}

/**
 * Reads the directives of the body of an HTML comment.
 *
 * Marp reads a comment that holds YAML as directives. The body is read as
 * directives only when every line is a `key: value` pair and at least one key
 * is a directive the settings edit, so a presenter note is left alone. A value
 * the settings cannot show, such as a YAML array, is kept as an other line.
 *
 * @param body The text between `<!--` and `-->`.
 * @return The directives, or `null` when the comment holds none.
 */
export function parseMarpDirectiveComment(
	body: string
): MarpDirectiveComment | null {
	const lines = groupYamlLines( body );
	const values: MarpDirectiveValues = {};
	const rawValues: MarpDirectiveValues = {};
	const spotDirectives: Partial< Record< MarpDirectiveName, boolean > > = {};
	const otherLines: string[] = [];
	let spotCount = 0;
	let globalCount = 0;
	for ( const line of lines ) {
		// A YAML comment, such as `# Title slide`, is kept as written.
		if ( line.startsWith( '#' ) ) {
			otherLines.push( line );
			continue;
		}
		const match = LINE_PATTERN.exec( line.split( '\n' )[ 0 ] );
		if ( ! match ) {
			return null;
		}
		const [ , underscore, name, raw ] = match;
		if ( ! isDirectiveName( name ) ) {
			otherLines.push( line );
			continue;
		}
		if ( underscore ) {
			spotCount++;
		} else {
			globalCount++;
		}
		const scalar = parseScalar( raw );
		const isPlainValue =
			! line.includes( '\n' ) &&
			! /^[ \t]*[[{|>&*!]/.test( raw ) &&
			scalar.comment === '';
		// The form shows one value for each directive. A value it cannot
		// show, or a second one in the other scope, such as `class` beside
		// `_class`, is kept as written.
		if ( ! isPlainValue || name in spotDirectives ) {
			otherLines.push( line );
			spotDirectives[ name ] ??= !! underscore;
			continue;
		}
		values[ name ] = scalar.value;
		rawValues[ name ] = raw.trim();
		spotDirectives[ name ] = !! underscore;
	}
	if ( spotCount + globalCount === 0 ) {
		return null;
	}
	return {
		values,
		isSpot: spotCount >= globalCount,
		otherLines,
		rawValues,
		spotDirectives,
	};
}

/**
 * Finds the first HTML comment that holds directives the slide settings edit.
 *
 * @param html The content of the HTML block.
 * @return The comment and where it sits, or `null` when there is none.
 */
export function findMarpDirectiveComment(
	html: string
): FoundMarpDirectiveComment | null {
	for ( const match of html.matchAll( COMMENT_PATTERN ) ) {
		const parsed = parseMarpDirectiveComment( match[ 1 ] );
		if ( parsed ) {
			const start = match.index ?? 0;
			return { ...parsed, start, end: start + match[ 0 ].length };
		}
	}
	return null;
}

/**
 * Applies one scope to every directive of the comment, including those kept
 * as written. A kept directive that would then share its key with another
 * one is dropped, since Marp drops a comment with the same key twice.
 *
 * @param comment The directives.
 * @param isSpot  Whether they apply to this slide only.
 * @return The directives with the scope applied.
 */
export function setMarpDirectiveScope(
	comment: MarpDirectiveComment,
	isSpot: boolean
): MarpDirectiveComment {
	const prefix = isSpot ? '_' : '';
	const keys = new Set(
		Object.keys( comment.values ).map( ( name ) => prefix + name )
	);
	const otherLines = comment.otherLines.flatMap( ( line ) => {
		const match = LINE_PATTERN.exec( line.split( '\n' )[ 0 ] );
		if ( ! match || ! isDirectiveName( match[ 2 ] ) ) {
			return [ line ];
		}
		const key = prefix + match[ 2 ];
		if ( keys.has( key ) ) {
			return [];
		}
		keys.add( key );
		return [ key + line.slice( match[ 1 ].length + match[ 2 ].length ) ];
	} );
	return { ...comment, isSpot, spotDirectives: undefined, otherLines };
}

/**
 * Writes a value as a YAML scalar that can sit in an HTML comment. A `-->`
 * would end the comment, so it is written with an escaped `>` inside double
 * quotes, which YAML reads back as `-->`. A backslash is written inside
 * double quotes too: Marp's loose YAML wraps a plain value in double quotes
 * without escaping it, so `C:\work` would read as an invalid escape and drop
 * the whole comment.
 *
 * @param value The value.
 * @return The YAML scalar.
 */
function formatMarpDirectiveValue( value: string ): string {
	if ( ! value.includes( '-->' ) && ! value.includes( '\\' ) ) {
		return formatScalar( value );
	}
	return JSON.stringify( value ).replace( /-->/g, '--\\u003E' );
}

/**
 * Writes the directives as an HTML comment: on one line when it holds one
 * line, otherwise one line per directive.
 *
 * @param comment The directives.
 * @return The comment, or `''` when it holds nothing.
 */
export function serializeMarpDirectiveComment(
	comment: MarpDirectiveComment
): string {
	const keys: string[] = [];
	const lines = [
		...MARP_DIRECTIVES.flatMap( ( name ) => {
			// An empty value is written too: `_header: ""` hides the header
			// that earlier slides set.
			const value = comment.values[ name ]?.trim();
			if ( value === undefined ) {
				return [];
			}
			const isSpot = comment.spotDirectives?.[ name ] ?? comment.isSpot;
			const key = `${ isSpot ? '_' : '' }${ name }`;
			keys.push( key );
			const raw = comment.rawValues?.[ name ];
			const written =
				raw !== undefined && parseScalar( raw ).value === value
					? raw
					: formatMarpDirectiveValue( value );
			return [ `${ key }: ${ written }` ];
		} ),
		// A value the settings cannot show, such as a YAML array, is
		// replaced once its field is set, since Marp drops a comment with
		// the same key twice.
		...comment.otherLines.filter( ( line ) => {
			const match = LINE_PATTERN.exec( line.split( '\n' )[ 0 ] );
			return ! match || ! keys.includes( match[ 1 ] + match[ 2 ] );
		} ),
	];
	if ( lines.length === 0 ) {
		return '';
	}
	if ( lines.length === 1 ) {
		return `<!-- ${ lines[ 0 ] } -->`;
	}
	return `<!--\n${ lines.join( '\n' ) }\n-->`;
}

/**
 * Puts the directives into the HTML. The directive comment already there is
 * replaced in place and the rest of the HTML is kept; without one, the new
 * comment goes at the start. A comment left empty is removed with its line
 * break.
 *
 * @param html    The content of the HTML block.
 * @param comment The directives.
 * @return The updated HTML.
 */
export function setMarpDirectiveComment(
	html: string,
	comment: MarpDirectiveComment
): string {
	const serialized = serializeMarpDirectiveComment( comment );
	const found = findMarpDirectiveComment( html );
	if ( found ) {
		let { start, end } = found;
		if ( ! serialized ) {
			// Removes the line break that followed, or else preceded, it.
			if ( html.slice( end ).startsWith( '\n' ) ) {
				end++;
			} else if ( html.slice( 0, start ).endsWith( '\n' ) ) {
				start--;
			}
		}
		return html.slice( 0, start ) + serialized + html.slice( end );
	}
	if ( ! serialized ) {
		return html;
	}
	return html ? `${ serialized }\n${ html }` : serialized;
}

/**
 * Splits a class value into the classes a theme provides and the others.
 *
 * @param value   The class directive, such as `lead invert`.
 * @param classes The classes the theme provides.
 * @return The theme classes that are set, and the other classes as text.
 */
export function splitMarpClasses(
	value: string,
	classes: string[]
): { selected: string[]; other: string } {
	const tokens = value.split( /\s+/ ).filter( Boolean );
	return {
		selected: tokens.filter( ( token ) => classes.includes( token ) ),
		other: tokens
			.filter( ( token ) => ! classes.includes( token ) )
			.join( ' ' ),
	};
}

/**
 * Joins the theme classes and the other classes into a class value, with the
 * theme classes in the order the theme lists them.
 *
 * @param selected The theme classes that are set.
 * @param other    The other classes, separated by spaces.
 * @param classes  The classes the theme provides.
 * @return The class directive.
 */
export function joinMarpClasses(
	selected: string[],
	other: string,
	classes: string[]
): string {
	return [
		...classes.filter( ( name ) => selected.includes( name ) ),
		...other.split( /\s+/ ).filter( Boolean ),
	].join( ' ' );
}
