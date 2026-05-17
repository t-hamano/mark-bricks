/**
 * External dependencies
 */
import type { List } from 'mdast';
import type { Options } from 'remark-stringify';

/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import { createBlock } from '../utils';
import * as listItemConverter from '../list-item/converter';
import type { NodeResult } from '../types';
import type { BlockAttributes, ListMarker } from './types';

const DEFAULT_ORDERED_MARKER: ListMarker = '.';
const DEFAULT_UNORDERED_MARKER: ListMarker = '-';

/**
 * Detects the original list marker from the Markdown source.
 *
 * The mdast List node carries no syntactic detail, so the first item's
 * `position` is used to slice the marker out of the source: a bullet
 * character for unordered lists, or the delimiter following the number for
 * ordered lists.
 *
 * @param node   mdast List node from remark-parse.
 * @param source The original markdown source.
 * @return The detected marker, or the default when it cannot be determined.
 */
function detectMarker( node: List, source: string ): ListMarker {
	const offset = node.children[ 0 ]?.position?.start.offset;
	if ( offset === undefined ) {
		return node.ordered ? DEFAULT_ORDERED_MARKER : DEFAULT_UNORDERED_MARKER;
	}
	if ( node.ordered ) {
		// The marker is the number plus a `.` or `)`, e.g. `1.` or `12)`.
		const match = source.slice( offset, offset + 32 ).match( /^\d+([.)])/ );
		return ( match?.[ 1 ] as ListMarker ) ?? DEFAULT_ORDERED_MARKER;
	}
	const char = source[ offset ];
	if ( char === '-' || char === '*' || char === '+' ) {
		return char;
	}
	return DEFAULT_UNORDERED_MARKER;
}

/**
 * Converts an mdast List node into a `core/list` block.
 *
 * Each `listItem` child becomes a `core/list-item` inner block. CommonMark
 * allows several marker characters and a loose/tight spacing, none of which
 * `core/list` represents, so they are detected from `source` and stored on
 * `markdownData` for round-tripping.
 *
 * ## Unordered
 *
 * The bullet may be `-`, `*`, or `+`.
 *
 * ```md
 * - one
 * - two
 * ```
 *
 * ## Ordered
 *
 * The number may be followed by `.` or `)`, and the list may start at any
 * number.
 *
 * ```md
 * 1. one
 * 2. two
 * ```
 *
 * @param node   mdast List node from remark-parse.
 * @param source The original markdown source, required to detect the marker
 *               via `node.position`.
 * @return `core/list` block.
 */
export function toBlock( node: List, source: string ): Block {
	const ordered = !! node.ordered;
	const attributes: BlockAttributes = {
		ordered,
		markdownData: {
			marker: detectMarker( node, source ),
			spread: !! node.spread,
		},
	};
	// A `start` of 1 is the implicit default, so it is only stored when the
	// list begins at a different number.
	if ( ordered && node.start !== null && node.start !== 1 ) {
		attributes.start = node.start;
	}
	const innerBlocks = node.children.map( ( item ) =>
		listItemConverter.toBlock( item, source )
	);
	return createBlock( 'core/list', attributes, innerBlocks );
}

/**
 * Builds an mdast List node from a `core/list` block.
 *
 * Exposed separately from {@link toNode} so the `core/list-item` converter can
 * embed a nested list without re-deriving serialization options (the options
 * are only meaningful for the top-level `stringify` call).
 *
 * @param block `core/list` block.
 * @return mdast List node, with `listItem` children built recursively.
 */
export function buildListNode( block: Block ): List {
	const { ordered, start, markdownData } =
		block.attributes as BlockAttributes;
	const spread = !! markdownData?.spread;
	const node: List = {
		type: 'list',
		ordered: !! ordered,
		spread,
		children: block.innerBlocks.map( ( item ) =>
			listItemConverter.toNode( item, spread )
		),
	};
	if ( ordered ) {
		node.start = start ?? 1;
	}
	return node;
}

/**
 * Derives the remark-stringify marker options for a `core/list` tree.
 *
 * `bullet` and `bulletOrdered` are global stringify options, so the whole tree
 * is walked and the first marker of each kind wins. Nested lists that use a
 * different marker of the *same* kind cannot be represented and fall back to
 * this marker (known limitation).
 *
 * @param block Top-level `core/list` block.
 * @return remark-stringify options.
 */
function deriveOptions( block: Block ): Options {
	const options: Options = {};
	const visit = ( current: Block ): void => {
		if ( current.name === 'core/list' ) {
			const { ordered, markdownData } =
				current.attributes as BlockAttributes;
			const marker = markdownData?.marker;
			if ( marker ) {
				if ( ordered && ! options.bulletOrdered ) {
					options.bulletOrdered =
						marker as Options[ 'bulletOrdered' ];
				} else if ( ! ordered && ! options.bullet ) {
					options.bullet = marker as Options[ 'bullet' ];
				}
			}
		}
		current.innerBlocks.forEach( visit );
	};
	visit( block );
	return options;
}

/**
 * Converts a `core/list` block back into an mdast List node.
 *
 * The marker is restored from `markdownData.marker` via the remark-stringify
 * `bullet` / `bulletOrdered` options, and the loose/tight spacing from
 * `markdownData.spread` via the `spread` flag on the List and `listItem` nodes.
 *
 * @param block `core/list` block.
 * @return mdast List node together with serialization options.
 */
export function toNode( block: Block ): NodeResult< List > {
	return {
		node: buildListNode( block ),
		options: deriveOptions( block ),
	};
}
