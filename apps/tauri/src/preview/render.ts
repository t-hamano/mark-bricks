/**
 * External dependencies
 */
import { convertFileSrc } from '@tauri-apps/api/core';
import { rewriteFontSources } from '@mark-bricks/editor/katex-fonts';
import {
	renderSlides as renderMarpSlides,
	type RenderedSlides,
} from '@mark-bricks/marp-preview';

/**
 * Internal dependencies
 */
import { resolveImagePath } from '../platform';

/**
 * Renders a Marp slide deck, with local images pointed at the asset protocol
 * the same way the editor does, and KaTeX pointed at the fonts the app
 * bundles.
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
	const { html, css } = renderMarpSlides( markdown, {
		resolveImageSrc: ( src ) => {
			const path = resolveImagePath( src, documentPath );
			return path ? convertFileSrc( path ) : null;
		},
	} );
	return { html, css: rewriteFontSources( css ) };
}
