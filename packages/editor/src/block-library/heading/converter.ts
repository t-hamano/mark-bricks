/**
 * External dependencies
 */
import type { Heading } from 'mdast';

/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import {
	contentToInline,
	createBlock,
	inlineToContent,
	richTextToString,
} from '../utils';
import type { NodeResult } from '../types';
import type { BlockAttributes } from './types';

function isSetext( node: Heading ): boolean {
	if ( node.depth > 2 ) {
		return false;
	}
	if ( ! node.position ) {
		return false;
	}
	return node.position.end.line > node.position.start.line;
}

/**
 * Converts an mdast Heading node into a `core/heading` block.
 *
 * CommonMark has two heading syntaxes that parse to the same mdast Heading
 * node. The original syntax is kept for round-tripping.
 *
 * ## ATX (prefix style)
 *
 * Single-line, supports levels 1-6.
 *
 * ```md
 * # h1
 * ## h2
 * ### h3
 * #### h4
 * ##### h5
 * ###### h6
 * ```
 *
 * ## Setext (underline style)
 *
 * Multi-line, supports only levels 1 and 2. The underline must consist of
 * one or more `=` (h1) or `-` (h2) characters.
 *
 * ```md
 * h1
 * ==
 *
 * h2
 * --
 * ```
 *
 * @param node mdast Heading node from remark-parse.
 * @return `core/heading` block.
 */
export function toBlock( node: Heading ): Block {
	return createBlock( 'core/heading', {
		content: inlineToContent( node.children ),
		level: node.depth,
		markdownData: {
			format: isSetext( node ) ? 'setext' : 'atx',
		},
	} );
}

/**
 * Converts a `core/heading` block back into an mdast Heading node.
 *
 * The syntax is restored from `markdownData.format`: `setext` emits via the
 * `options.setext` flag, otherwise ATX is used.
 *
 * @param block `core/heading` block.
 * @return mdast Heading node together with serialization options.
 */
export function toNode( block: Block ): NodeResult< Heading > {
	const { attributes } = block;
	const { content, level, markdownData } = attributes as BlockAttributes;
	const depth: Heading[ 'depth' ] =
		level >= 1 && level <= 6 ? ( level as Heading[ 'depth' ] ) : 2;

	return {
		node: {
			type: 'heading',
			depth,
			children: contentToInline( richTextToString( content ) ),
		},
		options: { setext: markdownData?.format === 'setext' },
	};
}
