/**
 * External dependencies
 */
import { unified } from 'unified';
import remarkStringify from 'remark-stringify';
import remarkGfm from 'remark-gfm';
import type { Root } from 'mdast';

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
import type { NodeResult } from '../block-library/types';

/**
 * Maps a single block to its corresponding mdast node.
 *
 * Exposed separately from {@link blocksToMarkdown} so container-block
 * converters (e.g. `core/quote`) can recursively convert their own inner
 * blocks without re-deriving the block-to-node dispatch. Block names that have
 * no converter yield `null`, i.e. the block is dropped.
 *
 * @param block Block to convert.
 * @return The mdast node together with its serialization options, or `null`
 *         when the block has no converter.
 */
export function blockToNode( block: Block ): NodeResult | null {
	switch ( block.name ) {
		case 'core/paragraph':
			return paragraphConverter.toNode( block );
		case 'core/heading':
			return headingConverter.toNode( block );
		case 'core/code':
			return codeConverter.toNode( block );
		case 'core/separator':
			return separatorConverter.toNode( block );
		case 'core/table':
			return tableConverter.toNode( block );
		case 'core/list':
			return listConverter.toNode( block );
		case 'core/image':
			return imageConverter.toNode( block );
		case 'core/quote':
			return quoteConverter.toNode( block );
		case 'core/html':
			return htmlConverter.toNode( block );
		case 'core/details':
			return detailsConverter.toNode( block );
		default:
			return null;
	}
}

/**
 * Converts an array of blocks into a Markdown string.
 *
 * Each block is stringified independently, trailing newlines are trimmed, and
 * empty results are dropped. The remaining segments are joined with a blank
 * line so that adjacent blocks become separate Markdown paragraphs.
 *
 * @param blocks Blocks to convert.
 * @return Markdown string. Empty when there is no convertible content;
 *         otherwise terminated by a single trailing newline.
 */
export function blocksToMarkdown( blocks: Block[] ): string {
	const segments = blocks
		// Convert each block to a single-node mdast tree and stringify it to
		// Markdown. A block with no converter yields an empty string.
		.map( ( block ) => {
			const result = blockToNode( block );
			if ( ! result ) {
				return '';
			}
			const tree: Root = {
				type: 'root',
				children: [ result.node ],
			};
			return unified()
				.use( remarkStringify, result.options ?? {} )
				.use( remarkGfm )
				.stringify( tree );
		} )
		// Strip the trailing newline remark-stringify appends, since the
		// segments are rejoined with an explicit blank line below.
		.map( ( s ) => s.replace( /\n+$/, '' ) )
		// Drop empty segments (blocks with no converter, or empty output).
		.filter( ( s ) => s !== '' );
	return segments.length === 0 ? '' : segments.join( '\n\n' ) + '\n';
}
