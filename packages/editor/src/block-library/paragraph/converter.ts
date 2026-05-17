/**
 * External dependencies
 */
import type { Paragraph } from 'mdast';

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

/**
 * Converts an mdast Paragraph node into a `core/paragraph` block.
 *
 * @param node mdast Paragraph node from remark-parse.
 * @return `core/paragraph` block.
 */
export function toBlock( node: Paragraph ): Block {
	return createBlock( 'core/paragraph', {
		content: inlineToContent( node.children ),
	} );
}

/**
 * Converts a `core/paragraph` block into an mdast Paragraph node.
 *
 * @param block `core/paragraph` block.
 * @return mdast Paragraph node.
 */
export function toNode( block: Block ): NodeResult< Paragraph > {
	const { attributes } = block;
	const { content } = attributes as BlockAttributes;
	return {
		node: {
			type: 'paragraph',
			children: contentToInline( richTextToString( content ) ),
		},
	};
}
