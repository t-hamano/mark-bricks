/**
 * External dependencies
 */
import { defaultHandlers } from 'mdast-util-to-markdown';
import type { Handle, Handlers, State } from 'mdast-util-to-markdown';
import type { Emphasis, Nodes, Strong } from 'mdast';

/**
 * Internal dependencies
 */
import type { InlineMarker } from '../../block-library/utils';
import { withOption } from './with-option';

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
 * Records the marker an Emphasis or Strong node was written with.
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
 * `source` and stored on `node.data`, from where {@link inlineMarkerHandlers}
 * restores it. Any other node is left untouched.
 *
 * @param node   mdast node from remark-parse.
 * @param source The original markdown source.
 */
export function annotateInlineMarker( node: Nodes, source: string ): void {
	if ( node.type !== 'emphasis' && node.type !== 'strong' ) {
		return;
	}
	const marker = detectMarker( node, source );
	if ( marker ) {
		node.data = { ...node.data, marker };
	}
}

/**
 * Reads the marker stored on a node by {@link annotateInlineMarker}.
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
 * @param type The node type to handle.
 * @return The wrapped handler.
 */
function createHandler( type: MarkedType ): Handle {
	const defaultHandler = defaultHandlers[ type ];
	const handle: Handle = ( ...args ) => {
		const marker = nodeMarker( args[ 0 ] );
		return marker
			? withOption( type, marker, defaultHandler, ...args )
			: defaultHandler( ...args );
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
 * markers recorded by {@link annotateInlineMarker}.
 *
 * Nodes without a recorded marker fall back to the default, so text formatted
 * in the editor is written with `*` and `**`.
 */
export const inlineMarkerHandlers: Partial< Handlers > = Object.fromEntries(
	MARKED_TYPES.map( ( type ) => [ type, createHandler( type ) ] )
);
