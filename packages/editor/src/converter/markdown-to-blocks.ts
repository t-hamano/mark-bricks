/**
 * External dependencies
 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { Root, RootContent } from 'mdast';

/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import * as paragraphConverter from '../block-library/paragraph/converter';
import * as headingConverter from '../block-library/heading/converter';
import * as codeConverter from '../block-library/code/converter';
import * as separatorConverter from '../block-library/separator/converter';
import * as tableConverter from '../block-library/table/converter';
import * as listConverter from '../block-library/list/converter';
import * as imageConverter from '../block-library/image/converter';
import * as quoteConverter from '../block-library/quote/converter';
import * as htmlConverter from '../block-library/html/converter';

/**
 * Maps a single mdast node to its corresponding blocks.
 *
 * Exposed separately from {@link markdownToBlocks} so container-block
 * converters (e.g. `core/quote`) can recursively convert their own children
 * without re-deriving the node-to-block dispatch. Node types that have no
 * block converter yield an empty array, i.e. the node is dropped.
 *
 * @param node   mdast node from remark-parse, either a top-level child of the
 *               tree or a child of a container node.
 * @param source The original markdown source, forwarded to converters that
 *               detect syntax via `node.position`.
 * @return Blocks parsed from the node.
 */
export function nodeToBlocks( node: RootContent, source: string ): Block[] {
	switch ( node.type ) {
		case 'paragraph': {
			// An image on its own line parses to a Paragraph wrapping a
			// single Image; such a paragraph becomes a `core/image` block.
			const image = imageConverter.imageOnlyChild( node );
			return [
				image
					? imageConverter.toBlock( image, source )
					: paragraphConverter.toBlock( node ),
			];
		}
		case 'heading':
			return [ headingConverter.toBlock( node ) ];
		case 'code':
			return [ codeConverter.toBlock( node, source ) ];
		case 'thematicBreak':
			return [ separatorConverter.toBlock( node, source ) ];
		case 'table':
			return [ tableConverter.toBlock( node ) ];
		case 'list':
			return [ listConverter.toBlock( node, source ) ];
		case 'blockquote':
			return [ quoteConverter.toBlock( node, source ) ];
		case 'html':
			return [ htmlConverter.toBlock( node ) ];
		default:
			return [];
	}
}

/**
 * Converts a Markdown string into an array of blocks.
 *
 * The Markdown is parsed into an mdast tree with remark-parse, and each
 * top-level node is mapped to its corresponding block via {@link nodeToBlocks}.
 * Node types that have no block converter are dropped.
 *
 * @param markdown Markdown source to convert.
 * @return Blocks parsed from the Markdown.
 */
export function markdownToBlocks( markdown: string ): Block[] {
	const tree = unified()
		.use( remarkParse )
		.use( remarkGfm )
		.parse( markdown ) as Root;
	return tree.children.flatMap( ( node ) => nodeToBlocks( node, markdown ) );
}
