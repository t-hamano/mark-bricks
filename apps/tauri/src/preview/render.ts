/**
 * External dependencies
 */
import { convertFileSrc } from '@tauri-apps/api/core';
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
 * the same way the editor does.
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
	return renderMarpSlides( markdown, {
		resolveImageSrc: ( src ) => {
			const path = resolveImagePath( src, documentPath );
			return path ? convertFileSrc( path ) : null;
		},
	} );
}
