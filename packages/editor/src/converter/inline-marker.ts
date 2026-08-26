/**
 * External dependencies
 */
import { defaultHandlers } from 'mdast-util-to-markdown';
import type { Handle, Handlers, State } from 'mdast-util-to-markdown';
import type { Emphasis, Nodes, Strong } from 'mdast';

/**
 * Internal dependencies
 */
import type { InlineMarker } from '../block-library/utils';

/**
 * The mdast node types whose marker character can vary.
 */
const MARKED_TYPES = [ 'emphasis', 'strong' ] as const;

type MarkedType = ( typeof MARKED_TYPES )[ number ];
type MarkedNode = Emphasis | Strong;

/**
 * Detects the marker a node was written with in the Markdown source.
 *
 * mdast represents `*foo*` and `_foo_` with the same Emphasis node (and
 * likewise `**foo**` / `__foo__` with the same Strong node), so the original
 * text is sliced out via `node.position` and its first character inspected.
 *
 * @param node   mdast Emphasis or Strong node from remark-parse.
 * @param source The original markdown source.
 * @return The detected marker, or `undefined` when it cannot be determined.
 */
function detectMarker(
	node: MarkedNode,
	source: string
): InlineMarker | undefined {
	const offset = node.position?.start.offset;
	if ( offset === undefined ) {
		return undefined;
	}
	const char = source[ offset ];
	return char === '*' || char === '_' ? char : undefined;
}

/**
 * Records the original emphasis and strong markers on the parsed tree.
 *
 * CommonMark accepts two interchangeable markers for each of these formats:
 *
 * ## Emphasis
 *
 * ```md
 * *emphasis*
 * _emphasis_
 * ```
 *
 * ## Strong
 *
 * ```md
 * **strong**
 * __strong__
 * ```
 *
 * Both spellings parse to the same node, so the marker is detected from
 * `source` and stored on `node.data` before the tree is converted to blocks.
 * From there `inlineToContent` carries it into the block's inline content, and
 * {@link inlineMarkerHandlers} restores it on the way out.
 *
 * The tree is annotated in place, since the converters walk the very same
 * nodes.
 *
 * @param tree   mdast tree from remark-parse.
 * @param source The original markdown source.
 */
export function annotateInlineMarkers( tree: Nodes, source: string ): void {
	if ( tree.type === 'emphasis' || tree.type === 'strong' ) {
		const marker = detectMarker( tree, source );
		if ( marker ) {
			tree.data = { ...tree.data, marker };
		}
	}
	if ( 'children' in tree ) {
		for ( const child of tree.children ) {
			annotateInlineMarkers( child as Nodes, source );
		}
	}
}

/**
 * Reads the marker stored on a node by {@link annotateInlineMarkers}.
 *
 * @param node mdast node being serialized.
 * @return The marker, or `undefined` when the node carries none.
 */
function nodeMarker( node: unknown ): InlineMarker | undefined {
	const marker = ( node as MarkedNode ).data?.marker;
	return marker === '*' || marker === '_' ? marker : undefined;
}

/**
 * Wraps a default handler so it emits the marker stored on the node.
 *
 * `options.emphasis` and `options.strong` are document-wide, so a per-node
 * marker cannot be expressed through them. The default handler reads the
 * marker from `state.options` at the top of each call, so the option is
 * swapped for the duration of that call and restored afterwards — including
 * for nested nodes, which re-enter this wrapper and restore their own outer
 * value.
 *
 * @param type The node type to handle.
 * @return The wrapped handler.
 */
function createHandler( type: MarkedType ): Handle {
	const defaultHandler = defaultHandlers[ type ];
	const handle: Handle = ( node, parent, state, info ) => {
		const marker = nodeMarker( node );
		if ( ! marker ) {
			return defaultHandler( node, parent, state, info );
		}
		const previous = state.options[ type ];
		state.options[ type ] = marker;
		try {
			return defaultHandler( node, parent, state, info );
		} finally {
			state.options[ type ] = previous;
		}
	};
	// `containerPhrasing` peeks at the first character of the next sibling to
	// decide how to escape the current one. Without a `peek` the whole handler
	// would run for that lookahead, so the marker is reported directly.
	const peek = ( node: unknown, _parent: unknown, state: State ): string =>
		nodeMarker( node ) ?? state.options[ type ] ?? '*';
	return Object.assign( handle, { peek } );
}

/**
 * remark-stringify handlers that restore the original emphasis and strong
 * markers recorded by {@link annotateInlineMarkers}.
 *
 * Nodes without a recorded marker fall back to the default, so text formatted
 * in the editor is written with `*` and `**`.
 */
export const inlineMarkerHandlers: Partial< Handlers > = Object.fromEntries(
	MARKED_TYPES.map( ( type ) => [ type, createHandler( type ) ] )
);
