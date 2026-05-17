/**
 * External dependencies
 */
import type { Html } from 'mdast';

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
 * Converts an mdast Html node into a `core/html` block.
 *
 * Markdown passes raw HTML through verbatim, and remark-parse collects each
 * run of block-level HTML into a single Html node whose `value` is the raw
 * markup. That markup maps directly onto the `core/html` block's `content`
 * attribute, so no syntax detail needs to be tracked for round-tripping.
 *
 * ```md
 * <div class="note">Hello</div>
 * ```
 *
 * @param node mdast Html node from remark-parse.
 * @return `core/html` block.
 */
export function toBlock( node: Html ): Block {
	return createBlock( 'core/html', {
		content: node.value,
	} );
}

/**
 * Converts a `core/html` block back into an mdast Html node.
 *
 * The block's raw `content` is emitted unchanged; remark-stringify renders an
 * Html node verbatim without escaping.
 *
 * @param block `core/html` block.
 * @return mdast Html node.
 */
export function toNode( block: Block ): NodeResult< Html > {
	const { content } = block.attributes as BlockAttributes;
	return {
		node: {
			type: 'html',
			value: content ?? '',
		},
	};
}
