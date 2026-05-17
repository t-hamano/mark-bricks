/**
 * External dependencies
 */
import type { ThematicBreak } from 'mdast';

/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import { createBlock } from '../utils';
import type { NodeResult } from '../types';
import type {
	BlockAttributes,
	SeparatorFormat,
	SeparatorMarker,
} from './types';

const DEFAULT_FORMAT: SeparatorFormat = {
	marker: '-',
	repetition: 3,
	spaces: false,
};

/**
 * Detects the original thematic-break syntax from the Markdown source.
 *
 * The mdast ThematicBreak node carries no syntactic detail, so the original
 * text is sliced out via `node.position` and inspected directly.
 *
 * @param node   mdast ThematicBreak node from remark-parse.
 * @param source The original markdown source.
 * @return The detected format, or the default when it cannot be determined.
 */
function detectFormat( node: ThematicBreak, source: string ): SeparatorFormat {
	if ( ! node.position ) {
		return { ...DEFAULT_FORMAT };
	}
	const start = node.position.start.offset ?? 0;
	const end = node.position.end.offset ?? start;
	const raw = source.slice( start, end );
	const markers = raw.match( /[-*_]/g );
	if ( ! markers || markers.length < 3 ) {
		return { ...DEFAULT_FORMAT };
	}
	return {
		marker: markers[ 0 ] as SeparatorMarker,
		repetition: markers.length,
		// A space or tab between two markers marks the spaced style (`* * *`).
		spaces: /[-*_][ \t]+[-*_]/.test( raw ),
	};
}

/**
 * Converts an mdast ThematicBreak node into a `core/separator` block.
 *
 * CommonMark accepts a thematic break written with `-`, `*`, or `_`, repeated
 * three or more times, optionally spaced apart. All of these parse to the same
 * mdast ThematicBreak node, so the original syntax is detected from `source`
 * and stored on `markdownData.format` for round-tripping.
 *
 * ## Marker character
 *
 * Any of `-`, `*`, or `_` may be used.
 *
 * ```md
 * ---
 * ***
 * ___
 * ```
 *
 * ## Marker count
 *
 * Three or more markers; the exact count is preserved.
 *
 * ```md
 * -----
 * ```
 *
 * ## Spaced style
 *
 * A single space may separate each marker.
 *
 * ```md
 * - - -
 * ```
 *
 * @param node   mdast ThematicBreak node from remark-parse.
 * @param source The original markdown source, required to detect the original
 *               syntax via `node.position`.
 * @return `core/separator` block.
 */
export function toBlock( node: ThematicBreak, source: string ): Block {
	return createBlock( 'core/separator', {
		markdownData: { format: detectFormat( node, source ) },
	} );
}

/**
 * Converts a `core/separator` block back into an mdast ThematicBreak node.
 *
 * The syntax is restored from `markdownData.format` via the remark-stringify
 * `rule`, `ruleRepetition`, and `ruleSpaces` options.
 *
 * @param block `core/separator` block.
 * @return mdast ThematicBreak node together with serialization options.
 */
export function toNode( block: Block ): NodeResult< ThematicBreak > {
	const { attributes } = block;
	const { markdownData } = attributes as BlockAttributes;
	const format = markdownData?.format ?? DEFAULT_FORMAT;
	return {
		node: { type: 'thematicBreak' },
		options: {
			rule: format.marker,
			// CommonMark requires at least three markers.
			ruleRepetition: Math.max( 3, format.repetition ),
			ruleSpaces: format.spaces,
		},
	};
}
