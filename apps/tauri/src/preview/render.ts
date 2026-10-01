/**
 * External dependencies
 */
import { convertFileSrc } from '@tauri-apps/api/core';
import { Marp } from '@marp-team/marp-core';
import { rewriteFontSources } from '@mark-bricks/editor/katex-fonts';

/**
 * Internal dependencies
 */
import { resolveImagePath } from '../platform';

// The web fonts a built-in theme imports, which the app bundles instead: the
// CSP refuses stylesheets and fonts from other origins.
const WEB_FONT_IMPORT_PATTERN =
	/@import\s+(?:url\()?["']?https:\/\/fonts\.bunny\.net\/[^;]*;/g;

type RenderEnv = {
	documentPath?: string;
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
	// Keeps KaTeX's relative font URLs, to point them at the bundled fonts
	// instead of a CDN.
	math: { katexFontPath: false },
} ).use( ( md ) => {
	// Points local images at the asset protocol, the same way the editor
	// does. It runs before Marpit reads each image, so background images
	// (`![bg](…)`) get the resolved URL too.
	md.inline.ruler2.before(
		'marpit_parse_image',
		'mark_bricks_image_src',
		( { tokens, env }: InlineState ) => {
			for ( const token of tokens ) {
				const src = token.type === 'image' && token.attrGet( 'src' );
				const path = src && resolveImagePath( src, env.documentPath );
				if ( path ) {
					token.attrSet( 'src', convertFileSrc( path ) );
				}
			}
		}
	);
} );

export type RenderedSlides = {
	html: string;
	css: string;
};

/**
 * Renders a Marp slide deck the way the official Marp tools do, with its
 * stylesheet pointed at the fonts the app bundles.
 *
 * @param markdown     Markdown of the deck.
 * @param documentPath Path of the deck's file, to resolve relative image
 *                     paths against. Leave it out for an unsaved deck.
 * @return The slides' HTML and stylesheet.
 */
export function renderSlides(
	markdown: string,
	documentPath?: string
): RenderedSlides {
	const env: RenderEnv = { documentPath };
	const { html, css } = marp.render( markdown, env );
	return {
		html,
		css: rewriteFontSources( css.replace( WEB_FONT_IMPORT_PATTERN, '' ) ),
	};
}
