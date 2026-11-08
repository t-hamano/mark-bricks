/**
 * External dependencies
 */
import type { SlidePattern } from '@mark-bricks/editor/marp-patterns';

/**
 * Internal dependencies
 */
import { renderSlides } from '../render';

// The built-in themes the editor shows the patterns in.
export const SLIDE_PATTERN_THEMES = [ 'default', 'gaia', 'uncover' ] as const;

export type SlidePatternTheme = ( typeof SLIDE_PATTERN_THEMES )[ number ];

export type SlidePatternPreviews = {
	// The stylesheet of each theme, which every pattern shares.
	css: Record< SlidePatternTheme, string >;
	// The slides' HTML of each pattern in each theme, with the `{{key}}`
	// placeholders of its text left in.
	html: Record< string, Record< SlidePatternTheme, string > >;
};

/**
 * Renders every slide pattern in every built-in theme, for the editor to show
 * as the inserter's previews without bundling Marp.
 *
 * The text stays as `{{key}}` placeholders, so the editor can put in the text
 * of the current locale. A theme's stylesheet is kept once, since a pattern
 * has no style of its own.
 *
 * @param  patterns The patterns to render.
 * @return The previews' stylesheets and HTML.
 * @throws {Error} When a pattern changes its theme's stylesheet.
 */
export function renderSlidePatternPreviews(
	patterns: readonly SlidePattern[]
): SlidePatternPreviews {
	const deck = ( theme: SlidePatternTheme, body: string ) =>
		`---\nmarp: true\ntheme: ${ theme }\n---\n\n${ body }\n`;
	const css = Object.fromEntries(
		SLIDE_PATTERN_THEMES.map( ( theme ) => [
			theme,
			renderSlides( deck( theme, '' ) ).css,
		] )
	) as SlidePatternPreviews[ 'css' ];
	const html: SlidePatternPreviews[ 'html' ] = {};

	for ( const pattern of patterns ) {
		html[ pattern.name ] = {} as Record< SlidePatternTheme, string >;
		for ( const theme of SLIDE_PATTERN_THEMES ) {
			const rendered = renderSlides( deck( theme, pattern.markdown ) );
			if ( rendered.css !== css[ theme ] ) {
				throw new Error(
					`The "${ pattern.name }" pattern changes the stylesheet of the "${ theme }" theme. Patterns must not add styles of their own.`
				);
			}
			html[ pattern.name ][ theme ] = rendered.html;
		}
	}

	return { css, html };
}
