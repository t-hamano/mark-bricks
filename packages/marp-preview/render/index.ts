/**
 * External dependencies
 */
import { Marp } from '@marp-team/marp-core';

// The web fonts a built-in theme imports, which the hosts bundle instead:
// their CSP refuses stylesheets and fonts from other origins.
const WEB_FONT_IMPORT_PATTERN =
	/@import\s+(?:url\()?["']?https:\/\/fonts\.bunny\.net\/[^;]*;/g;

type RenderEnv = {
	resolveImageSrc?: ( src: string ) => string | null;
};

type InlineState = {
	tokens: Array< {
		type: string;
		attrGet: ( name: string ) => string | null;
		attrSet: ( name: string, value: string ) => void;
	} >;
	env: RenderEnv;
};

const marp = new Marp( {
	// The preview page runs Marp's browser script itself, since the CSP
	// refuses the inline one.
	script: false,
	// Keeps KaTeX's relative font URLs, for the host to point them at the
	// fonts it bundles instead of a CDN.
	math: { katexFontPath: false },
} ).use( ( md ) => {
	// Points images at the URL the host resolves them to. It runs before
	// Marpit reads each image, so background images (`![bg](…)`) get the
	// resolved URL too.
	md.inline.ruler2.before(
		'marpit_parse_image',
		'mark_bricks_image_src',
		( { tokens, env }: InlineState ) => {
			for ( const token of tokens ) {
				const src = token.type === 'image' && token.attrGet( 'src' );
				const resolved = src && env.resolveImageSrc?.( src );
				if ( resolved ) {
					token.attrSet( 'src', resolved );
				}
			}
		}
	);
} );

// Text of the controls on the preview pages. The host translates it, since
// the preview pages load no translations.
export type PreviewLabels = {
	enterSlideMode: string;
	exitSlideMode: string;
	exitSlideModeHint: string;
	previousSlide: string;
	nextSlide: string;
	slideNumber: string;
	slideLabel: string;
};

export type RenderSlidesOptions = {
	// Maps an image source in the deck to the URL the preview loads it
	// from, or returns `null` to keep the source as it is.
	resolveImageSrc?: ( src: string ) => string | null;
};

export type RenderedSlides = {
	html: string;
	css: string;
};

/**
 * Renders a Marp slide deck the way the official Marp tools do, without the
 * web fonts its theme imports. KaTeX's font URLs stay relative, for the host
 * to point them at the fonts it bundles.
 *
 * @param markdown Markdown of the deck.
 * @param options  How to resolve the deck's images.
 * @return The slides' HTML and stylesheet.
 */
export function renderSlides(
	markdown: string,
	options: RenderSlidesOptions = {}
): RenderedSlides {
	const env: RenderEnv = { resolveImageSrc: options.resolveImageSrc };
	const { html, css } = marp.render( markdown, env );
	return { html, css: css.replace( WEB_FONT_IMPORT_PATTERN, '' ) };
}
