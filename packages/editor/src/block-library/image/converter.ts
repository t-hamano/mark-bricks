/**
 * External dependencies
 */
import type { Image, Paragraph } from 'mdast';

/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import { createBlock } from '../utils';
import type { NodeResult } from '../types';
import type { BlockAttributes } from './types';

/**
 * Returns the sole Image child of a Paragraph, when there is one.
 *
 * In mdast an image is inline content (`PhrasingContent`), so `![alt](url)` on
 * its own line parses to a Paragraph wrapping a single Image rather than to a
 * block-level node. Such a paragraph maps to a `core/image` block, while a
 * paragraph that mixes an image with other inline content stays a
 * `core/paragraph`. The Markdown dispatcher uses this to decide between the
 * two.
 *
 * @param node mdast Paragraph node from remark-parse.
 * @return The sole Image child, or `null` when the paragraph is not
 *         image-only.
 */
export function imageOnlyChild( node: Paragraph ): Image | null {
	if ( node.children.length !== 1 ) {
		return null;
	}
	const [ child ] = node.children;
	return child.type === 'image' ? child : null;
}

/**
 * Converts an mdast Image node into a `core/image` block.
 *
 * CommonMark inline images carry a URL, alt text, and an optional title:
 *
 * ```md
 * ![alt text](image.png "a title")
 * ```
 *
 * `url`/`alt`/`title` map to the native `core/image` attributes. The title
 * delimiter has no native attribute, so the one `annotateSourceSyntax`
 * recorded on the node is stored on `markdownData.titleQuote` for
 * round-tripping.
 *
 * @param node mdast Image node from remark-parse.
 * @return `core/image` block.
 */
export function toBlock( node: Image ): Block {
	const attributes: BlockAttributes = {
		url: node.url,
		alt: node.alt ?? '',
	};
	if ( node.title ) {
		attributes.title = node.title;
		attributes.markdownData = {
			titleQuote: node.data?.titleQuote ?? '"',
		};
	}
	return createBlock( 'core/image', attributes );
}

/**
 * Converts a `core/image` block back into an mdast node.
 *
 * An Image is inline content and cannot sit at the document root, so it is
 * wrapped in a Paragraph. remark-stringify renders the Paragraph as a single
 * image line. The title delimiter is restored from `markdownData.titleQuote`
 * by the Image handler in `sourceSyntaxHandlers`.
 *
 * @param block `core/image` block.
 * @return mdast Paragraph node together with serialization options.
 */
export function toNode( block: Block ): NodeResult< Paragraph > {
	const { url, alt, title, markdownData } =
		block.attributes as BlockAttributes;
	const image: Image = {
		type: 'image',
		url: url ?? '',
		alt: alt ?? '',
		title: title || null,
		...( markdownData?.titleQuote
			? { data: { titleQuote: markdownData.titleQuote } }
			: {} ),
	};
	return {
		node: {
			type: 'paragraph',
			children: [ image ],
		},
	};
}
