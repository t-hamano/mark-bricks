/**
 * External dependencies
 */
import { Marp } from '@marp-team/marp-core';
import { rewriteFontSources } from '@mark-bricks/editor/katex-fonts';

// The web fonts a built-in theme imports, which the app bundles instead: the
// CSP refuses stylesheets and fonts from other origins.
const WEB_FONT_IMPORT_PATTERN =
	/@import\s+(?:url\()?["']?https:\/\/fonts\.bunny\.net\/[^;]*;/g;

const marp = new Marp( {
	// The preview page runs Marp's browser script itself, since the CSP
	// refuses the inline one.
	script: false,
	// Keeps KaTeX's relative font URLs, to point them at the bundled fonts
	// instead of a CDN.
	math: { katexFontPath: false },
} );

export type RenderedSlides = {
	html: string;
	css: string;
};

/**
 * Renders a Marp slide deck the way the official Marp tools do, with its
 * stylesheet pointed at the fonts the app bundles.
 *
 * @param markdown Markdown of the deck.
 * @return The slides' HTML and stylesheet.
 */
export function renderSlides( markdown: string ): RenderedSlides {
	const { html, css } = marp.render( markdown );
	return {
		html,
		css: rewriteFontSources( css.replace( WEB_FONT_IMPORT_PATTERN, '' ) ),
	};
}
