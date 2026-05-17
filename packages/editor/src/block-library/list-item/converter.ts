/**
 * External dependencies
 */
import type { ListItem } from 'mdast';

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
import * as listConverter from '../list/converter';
import type { BlockAttributes } from './types';

/**
 * Converts an mdast ListItem node into a `core/list-item` block.
 *
 * A list item holds block content: its leading paragraph supplies the item
 * text, and any nested `list` becomes a child `core/list` inner block. Other
 * block types (and extra paragraphs in a loose item) are dropped, since
 * `core/list-item` stores only inline text.
 *
 * A GFM task list item carries a boolean `checked`; an ordinary item has
 * `checked: null`. The boolean is stored on `markdownData.checked` so the
 * checkbox round-trips, while a `null` leaves `markdownData` absent. remark-gfm
 * already strips the `[ ]` / `[x]` marker from the paragraph text.
 *
 * Unlike a top-level block converter, this is always called from the
 * `core/list` converter and never reached directly by `markdownToBlocks`.
 *
 * @param node   mdast ListItem node from remark-parse.
 * @param source The original markdown source, forwarded to nested lists for
 *               marker detection.
 * @return `core/list-item` block.
 */
export function toBlock( node: ListItem, source: string ): Block {
	let content = '';
	let hasContent = false;
	const innerBlocks: Block[] = [];
	node.children.forEach( ( child ) => {
		if ( child.type === 'paragraph' && ! hasContent ) {
			content = inlineToContent( child.children );
			hasContent = true;
		} else if ( child.type === 'list' ) {
			innerBlocks.push( listConverter.toBlock( child, source ) );
		}
	} );
	const attributes: BlockAttributes = { content };
	if ( typeof node.checked === 'boolean' ) {
		attributes.markdownData = { checked: node.checked };
	}
	return createBlock( 'core/list-item', attributes, innerBlocks );
}

/**
 * Builds an mdast ListItem node from a `core/list-item` block.
 *
 * The item text becomes a leading paragraph, and each child `core/list` inner
 * block becomes a nested list. `spread` is inherited from the parent list so
 * the loose/tight spacing stays consistent.
 *
 * `markdownData.checked` is restored to the mdast `checked` field, which
 * remark-gfm renders as a `[ ]` / `[x]` task marker. An absent `checked` maps
 * to `null`, i.e. an ordinary list item with no checkbox.
 *
 * @param block  `core/list-item` block.
 * @param spread Loose/tight flag inherited from the parent `core/list`.
 * @return mdast ListItem node.
 */
export function toNode( block: Block, spread: boolean ): ListItem {
	const { content, markdownData } = block.attributes as BlockAttributes;
	const children: ListItem[ 'children' ] = [
		{
			type: 'paragraph',
			children: contentToInline( richTextToString( content ) ),
		},
	];
	block.innerBlocks.forEach( ( child ) => {
		if ( child.name === 'core/list' ) {
			children.push( listConverter.buildListNode( child ) );
		}
	} );
	return {
		type: 'listItem',
		spread,
		checked: markdownData?.checked ?? null,
		children,
	};
}
