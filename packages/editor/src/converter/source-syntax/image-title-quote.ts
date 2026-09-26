/**
 * External dependencies
 */
import { defaultHandlers } from 'mdast-util-to-markdown';
import type { Handle } from 'mdast-util-to-markdown';
import type { Image, Nodes } from 'mdast';

/**
 * Internal dependencies
 */
import { withOption } from './with-option';

/**
 * The delimiter used for an image title in the Markdown source.
 *
 * CommonMark allows `"…"`, `'…'`, and `(…)`. remark-stringify can only emit
 * the first two, so the parenthesised form is degraded to a double quote.
 */
export type TitleQuote = '"' | "'";

declare module 'mdast' {
	interface ImageData {
		titleQuote?: TitleQuote;
	}
}

/**
 * The attribute that carries an image title's delimiter through a block's
 * inline content. `"` is the default and is therefore never written out.
 */
export const IMAGE_TITLE_QUOTE_ATTRIBUTE = 'data-markdown-title-quote';

/**
 * Detects the delimiter used for an image title in the Markdown source.
 *
 * The image destination always closes with `)`, so the title delimiter is the
 * last non-whitespace character before it.
 *
 * A single quote maps to `'`. A double quote and the parenthesised form
 * `(…)` both map to `"`, because remark-stringify cannot emit a
 * parenthesised title.
 *
 * @param node   mdast Image node from remark-parse.
 * @param source The original markdown source.
 * @return The detected delimiter, or `undefined` when the position is unknown.
 */
function detectTitleQuote(
	node: Image,
	source: string
): TitleQuote | undefined {
	const start = node.position?.start.offset;
	const end = node.position?.end.offset;
	if ( start === undefined || end === undefined ) {
		return undefined;
	}
	const closer = source
		.slice( start, end - 1 )
		.trimEnd()
		.slice( -1 );
	return closer === "'" ? "'" : '"';
}

/**
 * Records the delimiter an Image node's title was written with.
 *
 * CommonMark accepts three interchangeable title delimiters:
 *
 * ```md
 * ![alt](image.png "title")
 * ![alt](image.png 'title')
 * ![alt](image.png (title))
 * ```
 *
 * All three parse to the same Image node, so the delimiter is detected from
 * `source` and stored on `node.data`, from where {@link imageHandler} restores
 * it. An image without a title, and any other node, is left untouched.
 *
 * @param node   mdast node from remark-parse.
 * @param source The original markdown source.
 */
export function annotateImageTitleQuote( node: Nodes, source: string ): void {
	if ( node.type !== 'image' || ! node.title ) {
		return;
	}
	const titleQuote = detectTitleQuote( node, source );
	if ( titleQuote ) {
		node.data = { ...node.data, titleQuote };
	}
}

const image: Handle = ( ...args ) => {
	const titleQuote = ( args[ 0 ] as Image ).data?.titleQuote;
	return titleQuote
		? withOption( 'quote', titleQuote, defaultHandlers.image, ...args )
		: defaultHandlers.image( ...args );
};

/**
 * remark-stringify handler for Image nodes, writing each title back with the
 * delimiter {@link annotateImageTitleQuote} recorded for it.
 *
 * The `quote` option is document-wide, so it cannot tell apart two images in
 * the same paragraph whose titles use different delimiters. An image carrying
 * no delimiter falls back to the option, i.e. `"`.
 */
export const imageHandler = Object.assign( image, {
	peek: defaultHandlers.image.peek,
} );
