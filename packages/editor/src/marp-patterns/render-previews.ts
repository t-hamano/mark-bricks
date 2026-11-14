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

// A rule of a scoped style, which Marp puts into the theme's stylesheet, and
// the random attribute it scopes the rule to.
const SCOPED_RULE =
	/div\.marpit > svg > foreignObject > section\[data-marpit-scope-\w+\][^{}]*\{[^{}]*\}/g;
const SCOPE_ATTRIBUTE = /data-marpit-scope-\w+/g;

/**
 * Renders every slide pattern in every built-in theme, for the inserter's
 * previews. Only the tests call it, to write `previews.generated.json`, so the
 * editor shows the previews without bundling Marp.
 *
 * The text stays as `{{key}}` placeholders, so the editor can put in the text
 * of the current locale. A theme's stylesheet is kept once, and the rules of a
 * pattern's scoped style are kept apart, for that pattern alone. Marp gives
 * each scoped style a random attribute, so it is named after the pattern
 * instead, to render the same previews every time.
 *
 * @param  patterns The patterns to render.
 * @return The previews' stylesheets and HTML.
 * @throws {Error} When a pattern changes its theme's stylesheet other than
 *                 with a scoped style.
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
	const styles: SlidePatternPreviews[ 'styles' ] = {};

	for ( const pattern of patterns ) {
		html[ pattern.name ] = {} as Record< SlidePatternTheme, string >;
		for ( const theme of SLIDE_PATTERN_THEMES ) {
			const rendered = renderSlides( deck( theme, pattern.markdown ) );
			const scope = `data-marpit-scope-${ pattern.name }`;
			const named = ( text: string ) =>
				text.replace( SCOPE_ATTRIBUTE, scope );
			const scoped = rendered.css.match( SCOPED_RULE ) ?? [];
			if ( rendered.css.replace( SCOPED_RULE, '' ) !== css[ theme ] ) {
				throw new Error(
					`The "${ pattern.name }" pattern changes the stylesheet of the "${ theme }" theme. Patterns may only add a scoped style.`
				);
			}
			html[ pattern.name ][ theme ] = named( rendered.html );
			if ( scoped.length > 0 ) {
				styles[ pattern.name ] ??= {} as Record<
					SlidePatternTheme,
					string
				>;
				styles[ pattern.name ][ theme ] = named( scoped.join( '' ) );
			}
		}
	}

	return { css, html, styles };
}
