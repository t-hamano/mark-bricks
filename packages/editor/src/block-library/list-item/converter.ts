/**
 * External dependencies
 */
import type { ListItem } from 'mdast';
import type { Options } from 'remark-stringify';

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
import { nodesToBlocks } from '../../converter/markdown-to-blocks';
import { blockToNode } from '../../converter/blocks-to-markdown';
import type { NodeResult } from '../types';
import type { BlockAttributes } from './types';

type ListItemChild = ListItem[ 'children' ][ number ];

/**
 * Converts an mdast ListItem node into a `core/list-item` block.
 *
 * A list item holds block content. A leading paragraph supplies the item
 * text, and every following block (a nested `list`, a further paragraph, a
 * code block, a quote, an image, ...) becomes an inner block in source
 * order. An item that opens with a non-paragraph block, such as a fenced
 * code block on the marker line, has an empty item text and keeps that block
 * as its first inner block.
 *
 * A GFM task list item carries a boolean `checked`; an ordinary item has
 * `checked: null`. The boolean is stored on `markdownData.checked` so the
 * checkbox round-trips, while a `null` leaves it absent. remark-gfm already
 * strips the `[ ]` / `[x]` marker from the paragraph text.
 *
 * Whether the item's blocks are separated by blank lines is stored on
 * `markdownData.spread`, but only when it differs from the parent list: a
 * tight list may hold a loose item, e.g. one with two paragraphs.
 *
 * Unlike a top-level block converter, this is always called from the
 * `core/list` converter and never reached directly by `markdownToBlocks`.
 *
 * @param node       mdast ListItem node from remark-parse.
 * @param source     The original markdown source, forwarded to the inner
 *                   block converters.
 * @param listSpread Loose/tight flag of the parent list.
 * @return `core/list-item` block.
 */
export function toBlock(
	node: ListItem,
	source: string,
	listSpread: boolean
): Block {
	const [ head, ...rest ] = node.children;
	const lead = head?.type === 'paragraph' ? head : undefined;
	const content = lead ? inlineToContent( lead.children ) : '';
	const innerBlocks = nodesToBlocks( lead ? rest : node.children, source );
	const markdownData: NonNullable< BlockAttributes[ 'markdownData' ] > = {};
	if ( typeof node.checked === 'boolean' ) {
		markdownData.checked = node.checked;
	}
	if ( !! node.spread !== listSpread ) {
		markdownData.spread = !! node.spread;
	}
	const attributes: BlockAttributes = { content };
	if ( Object.keys( markdownData ).length ) {
		attributes.markdownData = markdownData;
	}
	return createBlock( 'core/list-item', attributes, innerBlocks );
}

/**
 * Tells whether two adjacent blocks of a list item must be separated by a
 * blank line to be read back as two blocks.
 *
 * Without the blank line, the next block would otherwise continue the
 * previous one: a paragraph absorbs following text, a quote, table, HTML
 * block, or list absorbs it lazily, and two adjacent quotes or lists merge.
 * Only a nested list, a fenced code or math block, or a quote can start right
 * after a paragraph.
 *
 * @param prev The earlier block.
 * @param next The block directly after it.
 * @return Whether a blank line is required between them.
 */
function needsBlankLine( prev: ListItemChild, next: ListItemChild ): boolean {
	if ( ! [ 'list', 'code', 'math', 'blockquote' ].includes( next.type ) ) {
		return true;
	}
	if ( prev.type === 'html' ) {
		return true;
	}
	return (
		prev.type === next.type && next.type !== 'code' && next.type !== 'math'
	);
}

/**
 * Builds an mdast ListItem node from a `core/list-item` block.
 *
 * The item text becomes a leading paragraph, and each inner block is
 * converted after it in order: a child `core/list` becomes a nested list, and
 * any other block goes through {@link blockToNode}. Blocks with no converter
 * are dropped. The leading paragraph is omitted when the item text is empty
 * and the item opens with a block other than a nested list, so a block
 * written on the marker line round-trips, while a task item keeps it because
 * the checkbox belongs to it.
 *
 * `spread` comes from `markdownData.spread`, falling back to the parent list.
 * It is forced on when two adjacent blocks would otherwise merge, since the
 * item content would change on the next read.
 *
 * The serialization options of the inner blocks are merged into one object,
 * as remark-stringify applies them to the whole tree. On a key conflict the
 * first block wins, matching the `core/quote` converter.
 *
 * `markdownData.checked` is restored to the mdast `checked` field, which
 * remark-gfm renders as a `[ ]` / `[x]` task marker. An absent `checked` maps
 * to `null`, i.e. an ordinary list item with no checkbox.
 *
 * @param block      `core/list-item` block.
 * @param listSpread Loose/tight flag of the parent `core/list`.
 * @return mdast ListItem node together with serialization options.
 */
export function toNode(
	block: Block,
	listSpread: boolean
): NodeResult< ListItem > {
	const { content, markdownData } = block.attributes as BlockAttributes;
	const text = richTextToString( content );
	const checked = markdownData?.checked ?? null;
	const children: ListItemChild[] = [];
	let options: Options = {};
	block.innerBlocks.forEach( ( child ) => {
		const result =
			child.name === 'core/list'
				? listConverter.buildListNode( child )
				: blockToNode( child );
		if ( ! result ) {
			return;
		}
		children.push( result.node as ListItemChild );
		if ( result.options ) {
			options = { ...result.options, ...options };
		}
	} );
	const [ first ] = children;
	if ( text !== '' || checked !== null || ! first || first.type === 'list' ) {
		children.unshift( {
			type: 'paragraph',
			children: contentToInline( text ),
		} );
	}
	let spread = markdownData?.spread ?? listSpread;
	if (
		! spread &&
		children.some(
			( child, index ) =>
				index > 0 && needsBlankLine( children[ index - 1 ], child )
		)
	) {
		spread = true;
	}
	return {
		node: { type: 'listItem', spread, checked, children },
		options,
	};
}
