/**
 * WordPress dependencies
 */
import { escapeHTML } from '@wordpress/escape-html';

/**
 * Internal dependencies
 */
import { fillPlaceholders } from './placeholders';
import type { SlidePattern } from './types';

// The built-in themes the patterns are rendered in, for the inserter's
// previews. The first one stands in for any other theme.
export const SLIDE_PATTERN_THEMES = [ 'default', 'gaia', 'uncover' ] as const;

export type SlidePatternTheme = ( typeof SLIDE_PATTERN_THEMES )[ number ];

export type SlidePatternPreviews = {
	// The stylesheet of each theme, which every pattern shares.
	css: Record< SlidePatternTheme, string >;
	// The slides' HTML of each pattern in each theme, with the `{{key}}`
	// placeholders of its text left in.
	html: Record< string, Record< SlidePatternTheme, string > >;
	// The rules of each pattern's scoped style in each theme, for the patterns
	// that have one.
	styles: Record< string, Record< SlidePatternTheme, string > >;
};

let previews: Promise< SlidePatternPreviews > | undefined;

/**
 * Loads the previews rendered from the patterns ahead of time.
 *
 * They are a chunk of their own, so documents that are not slide decks never
 * load them.
 *
 * @return The previews.
 */
export function loadSlidePatternPreviews(): Promise< SlidePatternPreviews > {
	previews ??= import( './previews.generated.json' ).then(
		( module ) => module.default as SlidePatternPreviews
	);
	return previews;
}

/**
 * Picks the theme to show the previews in, from the deck's `theme`.
 *
 * @param theme The deck's `theme` directive, or `null` when it has none.
 * @return The built-in theme of that name, or `default` for any other.
 */
export function getSlidePatternTheme(
	theme: string | null
): SlidePatternTheme {
	const name = theme?.trim().toLowerCase();
	return (
		SLIDE_PATTERN_THEMES.find( ( builtIn ) => builtIn === name ) ??
		SLIDE_PATTERN_THEMES[ 0 ]
	);
}

/**
 * Returns a pattern's preview in a theme, with its text in the current
 * locale.
 *
 * @param all     The previews.
 * @param pattern The pattern.
 * @param theme   The theme.
 * @return The preview's HTML and stylesheet, or `null` when the previews
 *         have none for the pattern.
 */
export function getSlidePatternPreview(
	all: SlidePatternPreviews,
	pattern: SlidePattern,
	theme: SlidePatternTheme
): { html: string; css: string } | null {
	const html = all.html[ pattern.name ]?.[ theme ];
	if ( html === undefined ) {
		return null;
	}
	return {
		html: fillPlaceholders( html, pattern.strings(), escapeHTML ),
		css: all.css[ theme ] + ( all.styles[ pattern.name ]?.[ theme ] ?? '' ),
	};
}
