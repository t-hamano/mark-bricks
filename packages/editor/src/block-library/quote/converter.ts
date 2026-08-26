/**
 * External dependencies
 */
import type { Blockquote, Html, Paragraph, Text } from 'mdast';
import type { Options } from 'remark-stringify';

/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import { createBlock } from '../utils';
import { nodesToBlocks } from '../../converter/markdown-to-blocks';
import { blockToNode } from '../../converter/blocks-to-markdown';
import type { NodeResult } from '../types';
import type { AlertType, BlockAttributes } from './types';

/**
 * Matches a GFM alert marker at the start of a block quote's first line.
 *
 * The marker must be the only content of the line: after `[!TYPE]` only
 * trailing spaces are allowed before the line break (or the end of the text).
 * remark-parse keeps a soft line break as a literal `\n` inside the text node,
 * so the same node value holds both the marker and the alert body.
 */
const ALERT_PATTERN =
	/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][^\S\r\n]*(?:\r?\n|$)/i;

/**
 * Detects whether a block quote is a GFM alert and, if so, strips the marker.
 *
 * @param node mdast Blockquote node from remark-parse.
 * @return The alert type together with the marker-free children, or `null`
 *         when the quote is a plain block quote.
 */
function detectAlert(
	node: Blockquote
): { type: AlertType; children: Blockquote[ 'children' ] } | null {
	const firstBlock = node.children[ 0 ];
	if ( ! firstBlock || firstBlock.type !== 'paragraph' ) {
		return null;
	}
	const firstInline = firstBlock.children[ 0 ];
	if ( ! firstInline || firstInline.type !== 'text' ) {
		return null;
	}
	const match = firstInline.value.match( ALERT_PATTERN );
	if ( ! match ) {
		return null;
	}
	const type = match[ 1 ].toLowerCase() as AlertType;

	// Drop the marker from the first text node; keep what follows it.
	const rest = firstInline.value.slice( match[ 0 ].length );
	const inlineChildren: Paragraph[ 'children' ] = rest
		? [ { ...firstInline, value: rest }, ...firstBlock.children.slice( 1 ) ]
		: firstBlock.children.slice( 1 );

	// When the marker was the paragraph's only content the paragraph is now
	// empty and is dropped, so the alert body starts at the next block.
	const children: Blockquote[ 'children' ] =
		inlineChildren.length > 0
			? [
					{ ...firstBlock, children: inlineChildren },
					...node.children.slice( 1 ),
			  ]
			: node.children.slice( 1 );

	return { type, children };
}

/**
 * Converts an mdast Blockquote node into a `core/quote` block.
 *
 * A CommonMark block quote is a container: every line is prefixed with `>`,
 * and its content is itself a sequence of block-level nodes (paragraphs,
 * lists, headings, even nested block quotes). Its children are converted
 * recursively via {@link nodesToBlocks} and stored as inner blocks, so
 * `core/quote` mirrors the mdast tree shape.
 *
 * ```md
 * > a quote
 * >
 * > > nested
 * ```
 *
 * A block quote whose first line is a bare `[!NOTE]`-style marker is a GFM
 * alert; the marker is stripped and the kind is stored on
 * `markdownData.alertType`. The marker carries no other syntactic variation
 * worth preserving (remark always emits `> `), so no further `markdownData` is
 * stored. The `core/quote` `citation` attribute has no Markdown equivalent and
 * is left unset.
 *
 * ```md
 * > [!NOTE]
 * > Useful information that users should know.
 * ```
 *
 * @param node   mdast Blockquote node from remark-parse.
 * @param source The original markdown source, forwarded to child converters
 *               that detect syntax via `node.position`.
 * @return `core/quote` block.
 */
export function toBlock( node: Blockquote, source: string ): Block {
	const alert = detectAlert( node );
	const children = alert ? alert.children : node.children;
	const innerBlocks = nodesToBlocks( children, source );
	const attributes: BlockAttributes = alert
		? { markdownData: { alertType: alert.type } }
		: {};
	return createBlock( 'core/quote', attributes, innerBlocks );
}

/**
 * Builds an mdast Blockquote node from a `core/quote` block.
 *
 * Each inner block is converted back to a node via {@link blockToNode}; blocks
 * with no converter are dropped. The per-node serialization options are merged
 * into a single options object, since remark-stringify applies them globally
 * to the whole tree. On a key conflict the first child wins, matching the
 * `core/list` option-merging behaviour.
 *
 * When `markdownData.alertType` is set the `[!TYPE]` marker is restored: it is
 * prepended to the first paragraph (so the marker and the body round-trip on
 * adjacent lines), or, when the alert opens with a non-paragraph block, as a
 * standalone leading paragraph.
 *
 * The `citation` attribute is intentionally not serialized: CommonMark has no
 * block-quote citation syntax (known limitation).
 *
 * @param block `core/quote` block.
 * @return mdast Blockquote node together with serialization options.
 */
export function toNode( block: Block ): NodeResult< Blockquote > {
	const children: Blockquote[ 'children' ] = [];
	let options: Options = {};
	block.innerBlocks.forEach( ( child ) => {
		const result = blockToNode( child );
		if ( ! result ) {
			return;
		}
		children.push( result.node as Blockquote[ 'children' ][ number ] );
		if ( result.options ) {
			options = { ...result.options, ...options };
		}
	} );

	const { markdownData } = block.attributes as BlockAttributes;
	const alertType = markdownData?.alertType;
	if ( alertType ) {
		prependAlertMarker( children, alertType );
	}

	return {
		node: { type: 'blockquote', children },
		options,
	};
}

/**
 * Prepends a `[!TYPE]` alert marker to a block quote's children, in place.
 *
 * The marker is emitted as an mdast `html` node rather than `text`, because
 * remark-stringify escapes a leading `[` in a text node (`\[!NOTE]`), which
 * would break alert recognition. `html` nodes are written verbatim.
 *
 * @param children Block quote children built from the inner blocks.
 * @param type     Alert kind to serialize.
 */
function prependAlertMarker(
	children: Blockquote[ 'children' ],
	type: AlertType
): void {
	const marker: Html = { type: 'html', value: `[!${ type.toUpperCase() }]` };
	const first = children[ 0 ];
	if ( first && first.type === 'paragraph' ) {
		// A soft line break separates the marker from the body so they
		// round-trip onto consecutive `> ` lines.
		const lineBreak: Text = { type: 'text', value: '\n' };
		first.children = [ marker, lineBreak, ...first.children ];
		return;
	}
	// The alert opens with a non-paragraph block (or is empty): emit the
	// marker as its own paragraph above the body.
	children.unshift( { type: 'paragraph', children: [ marker ] } );
}
