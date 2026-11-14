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
	const lines = body.split( /\r?\n/ ).filter( ( line ) => line.trim() );
	const values: MarpDirectiveValues = {};
	const otherLines: string[] = [];
	let spotCount = 0;
	let globalCount = 0;
	for ( const line of lines ) {
		const match = LINE_PATTERN.exec( line );
		if ( ! match ) {
			return null;
		}
		const [ , underscore, name, raw ] = match;
		const scalar = parseScalar( raw );
		const isPlainValue =
			! /^[ \t]*[[{|>&*!]/.test( raw ) && scalar.comment === '';
		if ( ! isDirectiveName( name ) || ! isPlainValue ) {
			otherLines.push( line.trim() );
			continue;
		}
		values[ name ] = scalar.value;
		if ( underscore ) {
			spotCount++;
		} else {
			globalCount++;
		}
	}
	if ( spotCount + globalCount === 0 ) {
		return null;
	}
	return { values, isSpot: spotCount >= globalCount, otherLines };
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
 * Writes the directives as an HTML comment: on one line when it holds one
 * line, otherwise one line per directive.
 *
 * @param comment The directives.
 * @return The comment, or `''` when it holds nothing.
 */
export function serializeMarpDirectiveComment(
	comment: MarpDirectiveComment
): string {
	const prefix = comment.isSpot ? '_' : '';
	const lines = [
		...MARP_DIRECTIVES.flatMap( ( name ) => {
			// An empty value is written too: `_header: ""` hides the header
			// that earlier slides set.
			const value = comment.values[ name ]?.trim();
			return value === undefined
				? []
				: [ `${ prefix }${ name }: ${ formatScalar( value ) }` ];
		} ),
		...comment.otherLines,
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
