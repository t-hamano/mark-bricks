/**
 * The CSS filters Marp reads from an image's alt text, in the order Marpit
 * documents them.
 */
export const MARP_FILTERS = [
	'blur',
	'brightness',
	'contrast',
	'drop-shadow',
	'grayscale',
	'hue-rotate',
	'invert',
	'opacity',
	'saturate',
	'sepia',
] as const;

export type MarpFilterName = ( typeof MARP_FILTERS )[ number ];

/**
 * The value Marp applies when a filter keyword has no value, such as a bare
 * `blur`.
 */
export const MARP_FILTER_DEFAULTS: Record< MarpFilterName, string > = {
	blur: '10px',
	brightness: '1.5',
	contrast: '2',
	'drop-shadow': '0,5px,10px,rgba(0,0,0,.4)',
	grayscale: '1',
	'hue-rotate': '180deg',
	invert: '1',
	opacity: '.5',
	saturate: '2',
	sepia: '1',
};

export interface MarpImageFilter {
	name: MarpFilterName;
	/** The value after the colon. Empty when the keyword has no value. */
	value: string;
}

/**
 * The Marp keywords of an image's alt text, split from the rest of the text.
 */
export interface MarpImageOptions {
	/** `bg`: the image is a slide background. */
	background: boolean;
	/** `left` / `right`: the background takes one side of the slide. */
	split?: 'left' | 'right';
	/** The width of a split background, such as `40%`. */
	splitSize?: string;
	/** The background size keyword: `cover`, `contain`, `fit` or `auto`. */
	size?: string;
	/**
	 * The background scale, such as `50%`. Marp uses it over `size` when both
	 * are present.
	 */
	scale?: string;
	/** `w:` / `width:`, such as `200px` or `auto`. */
	width?: string;
	/** `h:` / `height:`, such as `30%` or `auto`. */
	height?: string;
	/** `vertical` / `horizontal`: how several backgrounds line up. */
	direction?: 'vertical' | 'horizontal';
	filters: MarpImageFilter[];
	/** The words that are not keywords: the alt text or caption. */
	text: string;
}

const BACKGROUND_SIZE_KEYWORDS = [ 'cover', 'contain', 'fit', 'auto' ];
const SCALE = /^(\d*\.)?\d+%$/;
const LENGTH = '((?:\\d*\\.)?\\d+(?:%|ch|cm|em|ex|in|mm|pc|pt|px)?|auto)';
const WIDTH = new RegExp( `^w(?:idth)?:${ LENGTH }$` );
const HEIGHT = new RegExp( `^h(?:eight)?:${ LENGTH }$` );
const SPLIT = /^(left|right)(?::((?:\d*\.)?\d+%))?$/;
const FILTER = new RegExp(
	`^(${ MARP_FILTERS.join( '|' ) })(?::(.+))?$`
) as RegExp;

/**
 * Tells whether a width or height value is one Marp accepts, such as
 * `200px`, `30%`, `200` or `auto`.
 *
 * @param value The value after `w:` or `h:`.
 * @return Whether Marp reads the value.
 */
export function isValidMarpLength( value: string ): boolean {
	return WIDTH.test( `w:${ value }` );
}

/**
 * Tells whether a value is a percentage, as a split width or background
 * scale takes.
 *
 * @param value The value to check, such as `40%`.
 * @return Whether the value is a percentage.
 */
export function isValidMarpPercentage( value: string ): boolean {
	return SCALE.test( value );
}

/**
 * Splits an image's alt text into Marp keywords and the remaining text,
 * following how Marpit reads it: the text is split on whitespace, keywords
 * are case-sensitive and may appear anywhere, and the background keywords
 * count only when `bg` is present.
 *
 * @param alt The alt text of the image.
 * @return The keywords and the remaining text.
 */
export function parseMarpImageAlt( alt: string ): MarpImageOptions {
	const words = alt.split( /\s+/ ).filter( Boolean );
	const background = words.includes( 'bg' );
	const options: MarpImageOptions = {
		background,
		filters: [],
		text: '',
	};
	const rest: string[] = [];

	for ( const word of words ) {
		let matched: RegExpMatchArray | null;
		if ( SCALE.test( word ) ) {
			options.scale = word;
		} else if ( ( matched = word.match( WIDTH ) ) ) {
			options.width = matched[ 1 ];
		} else if ( ( matched = word.match( HEIGHT ) ) ) {
			options.height = matched[ 1 ];
		} else if (
			( matched = word.match( FILTER ) ) &&
			// Marp reads a drop shadow value only with at least two parts.
			! (
				matched[ 1 ] === 'drop-shadow' &&
				matched[ 2 ] !== undefined &&
				! /^.+?,.+/.test( matched[ 2 ] )
			)
		) {
			options.filters.push( {
				name: matched[ 1 ] as MarpFilterName,
				value: matched[ 2 ] ?? '',
			} );
		} else if ( background && word === 'bg' ) {
			// Already recorded on `background`.
		} else if ( background && BACKGROUND_SIZE_KEYWORDS.includes( word ) ) {
			options.size = word;
		} else if ( background && ( matched = word.match( SPLIT ) ) ) {
			options.split = matched[ 1 ] as 'left' | 'right';
			options.splitSize = matched[ 2 ];
		} else if (
			background &&
			( word === 'vertical' || word === 'horizontal' )
		) {
			options.direction = word;
		} else {
			rest.push( word );
		}
	}

	options.text = rest.join( ' ' );
	return options;
}

/**
 * Builds an image's alt text from Marp keywords and the remaining text. The
 * keywords come first, in a fixed order, followed by the text. The
 * background keywords are left out unless the image is a background.
 *
 * @param options The keywords and the remaining text.
 * @return The alt text.
 */
export function serializeMarpImageAlt( options: MarpImageOptions ): string {
	const words: string[] = [];
	const { background } = options;

	if ( background ) {
		words.push( 'bg' );
		if ( options.split ) {
			words.push(
				options.splitSize
					? `${ options.split }:${ options.splitSize }`
					: options.split
			);
		}
		if ( options.size ) {
			words.push( options.size );
		}
		if ( options.scale ) {
			words.push( options.scale );
		}
	}
	if ( options.width ) {
		words.push( `w:${ options.width }` );
	}
	if ( options.height ) {
		words.push( `h:${ options.height }` );
	}
	if ( background && options.direction ) {
		words.push( options.direction );
	}
	for ( const { name, value } of options.filters ) {
		// A space would split the keyword, so it is dropped from the value.
		const compact = value.replace( /\s+/g, '' );
		words.push( compact ? `${ name }:${ compact }` : name );
	}
	const text = options.text.trim();
	if ( text ) {
		words.push( text );
	}
	return words.join( ' ' );
}
