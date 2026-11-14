/**
 * External dependencies
 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkGfm from 'remark-gfm';
import type { Root } from 'mdast';
import type { Options } from 'remark-stringify';

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
import * as mathConverter from '../block-library/math/converter';
import * as separatorConverter from '../block-library/separator/converter';
import * as tableConverter from '../block-library/table/converter';
import * as listConverter from '../block-library/list/converter';
import * as imageConverter from '../block-library/image/converter';
import * as quoteConverter from '../block-library/quote/converter';
import * as htmlConverter from '../block-library/html/converter';
import * as detailsConverter from '../block-library/details/converter';
import type { NodeResult } from '../block-library/types';
import {
	hasAttention,
	hasSameAttention,
	sourceSyntaxFallbackHandlers,
	sourceSyntaxHandlers,
} from './source-syntax';
import { remarkMathBlock } from './math-block';

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
		case 'core/math':
			return mathConverter.toNode( block );
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
 * Converts a single block into the Markdown it takes up in a document.
 *
 * @param block Block to convert.
 * @return Markdown string without a trailing newline. Empty when the block
 *         has no converter or no content.
 */
export function blockToMarkdown( block: Block ): string {
	// Convert the block to a single-node mdast tree and stringify it to
	// Markdown. A block with no converter yields an empty string.
	const result = blockToNode( block );
	if ( ! result ) {
		return '';
	}
	const tree: Root = {
		type: 'root',
		children: [ result.node ],
	};
	const { handlers, ...options } = result.options ?? {};
	const markdown = stringify( tree, {
		...options,
		handlers: { ...sourceSyntaxHandlers, ...handlers },
	} );
	// The source syntax handlers keep each emphasis and strong marker as it
	// was written, which can merge adjacent ones (`*a**b*`). In that case the
	// block is written again, letting the markers change where they must.
	if (
		! hasAttention( tree ) ||
		hasSameAttention( tree, parseMarkdown( markdown ) )
	) {
		return markdown;
	}
	return stringify( tree, {
		...options,
		handlers: { ...sourceSyntaxFallbackHandlers, ...handlers },
	} );
}

/**
 * Stringifies a tree with the extensions the editor writes.
 *
 * @param tree    The tree to stringify.
 * @param options remark-stringify options.
 * @return Markdown without a trailing newline.
 */
function stringify( tree: Root, options: Options ): string {
	return (
		unified()
			.use( remarkStringify, options )
			.use( remarkGfm )
			.use( remarkMathBlock )
			.stringify( tree )
			// Strip the trailing newline remark-stringify appends, since
			// blocks are joined with an explicit blank line.
			.replace( /\n+$/, '' )
	);
}

/**
 * Parses Markdown with the extensions the editor reads.
 *
 * @param markdown The Markdown to parse.
 * @return The mdast tree.
 */
function parseMarkdown( markdown: string ): Root {
	return unified()
		.use( remarkParse )
		.use( remarkGfm )
		.use( remarkMathBlock )
		.parse( markdown ) as Root;
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
		.map( blockToMarkdown )
		// Drop empty segments (blocks with no converter, or empty output).
		.filter( ( s ) => s !== '' );
	return segments.length === 0 ? '' : segments.join( '\n\n' ) + '\n';
}
