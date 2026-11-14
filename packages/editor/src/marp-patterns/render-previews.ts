/**
 * External dependencies
 */
import { renderSlides } from '@mark-bricks/marp-preview/render';

/**
 * Internal dependencies
 */
import {
	SLIDE_PATTERN_THEMES,
	type SlidePatternPreviews,
	type SlidePatternTheme,
} from './previews';
import type { SlidePattern } from './types';

/**
 * Renders every slide pattern in every built-in theme, for the inserter's
 * previews. Only the tests call it, to write `previews.generated.json`, so the
 * editor shows the previews without bundling Marp.
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
