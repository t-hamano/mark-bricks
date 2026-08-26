/**
 * External dependencies
 */
import type { Html, RootContent } from 'mdast';

/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import { createBlock, richTextToString } from '../utils';
import {
	markdownToBlocks,
	nodesToBlocks,
} from '../../converter/markdown-to-blocks';
import { blocksToMarkdown } from '../../converter/blocks-to-markdown';
import type { NodeResult } from '../types';
import type { BlockAttributes } from './types';

/**
 * Matches the `<details>` tag that opens the element, at the start of a node.
 */
const OPEN_TAG_PATTERN = /^<details(\s+open)?\s*>/i;

/**
 * Matches a `<summary>` element at the start of the element's content.
 */
const SUMMARY_PATTERN = /^\s*<summary\s*>([\s\S]*?)<\/summary\s*>/i;

/**
 * Matches any `<details>` or `</details>` tag, for nesting-depth tracking.
 */
const DETAILS_TAG_PATTERN = /<(\/?)details(?:\s[^>]*)?>/gi;

/**
 * The `core/details` block parsed out of a run of mdast nodes.
 */
type BlockResult = {
	block: Block;
	endIndex: number;
};

/**
 * Where the `</details>` tag closing the element was found in an Html value.
 */
type CloseTag = {
	start: number;
	end: number;
};

/**
 * Scans an Html node value for the `</details>` tag closing the element.
 *
 * `<details>` elements nest, so the closing tag is the one that brings the
 * depth back to zero rather than simply the first one encountered.
 *
 * @param value The Html node's raw markup.
 * @param depth Nesting depth carried over from the preceding nodes.
 * @return The depth after the value, plus the closing tag's position when the
 *         element closes inside this value.
 */
function scanDetailsTags(
	value: string,
	depth: number
): { depth: number; closeTag: CloseTag | null } {
	for ( const match of value.matchAll( DETAILS_TAG_PATTERN ) ) {
		depth += match[ 1 ] ? -1 : 1;
		if ( depth === 0 ) {
			return {
				depth,
				closeTag: {
					start: match.index,
					end: match.index + match[ 0 ].length,
				},
			};
		}
	}
	return { depth, closeTag: null };
}

/**
 * Converts a `<details>` element into a `core/details` block.
 *
 * Markdown has no disclosure syntax, so a collapsible section is written as
 * raw HTML. CommonMark ends an HTML block at the first blank line, which is
 * exactly what the conventional layout contains, so remark-parse yields the
 * element as a *run* of sibling nodes rather than one tree — an Html node for
 * the opening tag and the summary, the body as ordinary Markdown nodes, and an
 * Html node for the closing tag:
 *
 * ```md
 * <details>
 * <summary>More information</summary>
 *
 * The body is parsed as Markdown.
 *
 * </details>
 * ```
 *
 * This converter therefore takes the whole node list instead of a single node:
 * it matches the opening tag at `startIndex`, walks forward to the node
 * holding the matching closing tag (tracking nesting depth, so a nested
 * `<details>` closes its own element first), and converts everything between
 * the two into inner blocks via {@link nodesToBlocks}. Markup left over inside
 * the boundary nodes — the body of an element written without blank lines, for
 * instance — is parsed as its own Markdown document by
 * {@link markdownToBlocks}.
 *
 * The `open` attribute maps to `showContent` and the `<summary>` content to
 * `summary`; both elements are only recognized without further attributes, so
 * anything richer falls through to `core/html` and survives verbatim. The same
 * fallback applies to an element left unclosed, or one whose closing tag is
 * followed by more markup in the same node.
 *
 * @param nodes      mdast nodes containing the element, i.e. the children of a
 *                   root or of a container node.
 * @param startIndex Index of the node to match the opening tag at.
 * @param source     The original markdown source, forwarded to child
 *                   converters that detect syntax via `node.position`.
 * @return The `core/details` block and the index of the node holding its
 *         closing tag, or `null` when no element starts at `startIndex`.
 */
export function toBlock(
	nodes: RootContent[],
	startIndex: number,
	source: string
): BlockResult | null {
	const startNode = nodes[ startIndex ];
	if ( startNode?.type !== 'html' ) {
		return null;
	}
	const openTag = startNode.value.match( OPEN_TAG_PATTERN );
	if ( ! openTag ) {
		return null;
	}

	let depth = 0;
	let endIndex = -1;
	let endNode: Html | null = null;
	let closeTag: CloseTag | null = null;
	for ( let index = startIndex; index < nodes.length; index++ ) {
		const node = nodes[ index ];
		if ( node.type !== 'html' ) {
			continue;
		}
		const scan = scanDetailsTags( node.value, depth );
		if ( scan.closeTag ) {
			if ( node.value.slice( scan.closeTag.end ).trim() !== '' ) {
				return null;
			}
			endIndex = index;
			endNode = node;
			closeTag = scan.closeTag;
			break;
		}
		depth = scan.depth;
	}
	if ( ! endNode || ! closeTag ) {
		return null;
	}

	const opening =
		endNode === startNode
			? startNode.value.slice( openTag[ 0 ].length, closeTag.start )
			: startNode.value.slice( openTag[ 0 ].length );

	const summaryMatch = opening.match( SUMMARY_PATTERN );
	const content = summaryMatch
		? opening.slice( summaryMatch[ 0 ].length )
		: opening;

	const innerBlocks = markdownToBlocks( content );
	if ( endNode !== startNode ) {
		innerBlocks.push(
			...nodesToBlocks( nodes.slice( startIndex + 1, endIndex ), source ),
			...markdownToBlocks( endNode.value.slice( 0, closeTag.start ) )
		);
	}

	const attributes: BlockAttributes = {};
	if ( summaryMatch ) {
		attributes.summary = summaryMatch[ 1 ];
	}
	if ( openTag[ 1 ] ) {
		attributes.showContent = true;
	}

	return {
		block: createBlock( 'core/details', attributes, innerBlocks ),
		endIndex,
	};
}

/**
 * Builds an mdast Html node from a `core/details` block.
 *
 * The element is written in the layout {@link toBlock} reads back: the opening
 * tag, the `<summary>` element, then the inner blocks as Markdown fenced off
 * by blank lines so that they parse as Markdown rather than as raw HTML.
 *
 * Both the `<summary>` element and the body are omitted when empty, and the
 * `open` attribute is written only when `showContent` is set. The `name`
 * attribute of `core/details` is not serialized, since a `<details>` tag
 * carrying it is not recognized on the way in (known limitation).
 *
 * @param block `core/details` block.
 * @return mdast Html node holding the whole element.
 */
export function toNode( block: Block ): NodeResult< Html > {
	const { summary, showContent } = block.attributes as BlockAttributes;
	const lines = [ showContent ? '<details open>' : '<details>' ];

	const summaryContent = richTextToString( summary );
	if ( summaryContent ) {
		lines.push( `<summary>${ summaryContent }</summary>` );
	}

	const content = blocksToMarkdown( block.innerBlocks ).replace( /\n+$/, '' );
	if ( content ) {
		lines.push( '', content, '' );
	}

	lines.push( '</details>' );

	return { node: { type: 'html', value: lines.join( '\n' ) } };
}
