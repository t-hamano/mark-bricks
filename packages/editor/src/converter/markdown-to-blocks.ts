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
import * as detailsConverter from '../block-library/details/converter';

/**
 * Maps a single mdast node to its corresponding blocks.
 *
 * Exposed separately from {@link markdownToBlocks} so that a node can be
 * converted without re-deriving the node-to-block dispatch. Node types that
 * have no block converter yield an empty array, i.e. the node is dropped.
 *
 * Container-block converters (e.g. `core/quote`) convert their own children
 * through {@link nodesToBlocks} rather than this function, so that blocks
 * spanning several sibling nodes are matched inside containers too.
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
 * Maps a run of sibling mdast nodes to blocks.
 *
 * Most nodes convert one-to-one via {@link nodeToBlocks}, but a `<details>`
 * element is written as raw HTML and therefore parses to a *run* of sibling
 * nodes (see the `core/details` converter). Such a run is matched across the
 * list before the node at hand is converted on its own.
 *
 * @param nodes  mdast nodes, i.e. the children of a root or of a container
 *               node.
 * @param source The original markdown source, forwarded to converters that
 *               detect syntax via `node.position`.
 * @return Blocks parsed from the nodes.
 */
export function nodesToBlocks( nodes: RootContent[], source: string ): Block[] {
	const blocks: Block[] = [];
	for ( let index = 0; index < nodes.length; index++ ) {
		const details = detailsConverter.toBlock( nodes, index, source );
		if ( details ) {
			blocks.push( details.block );
			index = details.endIndex;
			continue;
		}
		blocks.push( ...nodeToBlocks( nodes[ index ], source ) );
	}
	return blocks;
}

/**
 * Converts a Markdown string into an array of blocks.
 *
 * The Markdown is parsed into an mdast tree with remark-parse, and its
 * top-level nodes are mapped to blocks via {@link nodesToBlocks}. Node types
 * that have no block converter are dropped.
 *
 * @param markdown Markdown source to convert.
 * @return Blocks parsed from the Markdown.
 */
export function markdownToBlocks( markdown: string ): Block[] {
	const tree = unified()
		.use( remarkParse )
		.use( remarkGfm )
		.parse( markdown ) as Root;
	return nodesToBlocks( tree.children, markdown );
}
