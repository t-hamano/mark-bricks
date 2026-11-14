/**
 * External dependencies
 */
import { defaultHandlers } from 'mdast-util-to-markdown';
import type {
	Attention,
	Handle,
	Handlers,
	State,
} from 'mdast-util-to-markdown';
import type { Emphasis, Nodes, Strong } from 'mdast';

/**
 * The marker characters CommonMark accepts for emphasis and strong emphasis.
 */
export type InlineMarker = '*' | '_';

declare module 'mdast' {
	interface EmphasisData {
		marker?: InlineMarker;
	}
	interface StrongData {
		marker?: InlineMarker;
	}
}

/**
 * The attribute that carries a non-default marker through a block's inline
 * content. `*` is the default and is therefore never written out.
 */
export const MARKER_ATTRIBUTE = 'data-markdown-marker';

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
 * @param type   The node type to handle.
 * @param strict Whether to offer only the stored (or default) marker. When
 *               `false`, the other marker is offered as a fallback.
 * @return The wrapped handler.
 */
function createHandler( type: MarkedType, strict: boolean ): Handle {
	const defaultHandler = defaultHandlers[ type ];
	const handle: Handle = ( ...args ) => defaultHandler( ...args );
	// `containerPhrasing` writes the node itself from the `attention` info of
	// its handler, choosing among the markers listed there. Given more than
	// one, it may swap the stored marker for one that does not touch a
	// neighbor's, even where the stored one parses back fine (`**a *b***` as
	// `**a _b_**`). The strict handlers therefore offer the stored marker
	// alone, and the fallback handlers put it first among the markers.
	const attention: Attention = ( node, state ) => {
		const info = defaultHandler.attention( node, state );
		const marker = nodeMarker( node ) ?? state.options[ type ] ?? '*';
		return {
			...info,
			markers: strict
				? [ marker ]
				: [ marker, ...info.markers.filter( ( m ) => m !== marker ) ],
		};
	};
	// `containerPhrasing` peeks at the first character of the next sibling to
	// decide how to escape the current one. Without a `peek` the whole handler
	// would run for that lookahead, so the marker is reported directly.
	const peek = ( node: unknown, _parent: unknown, state: State ): string =>
		nodeMarker( node ) ?? state.options[ type ] ?? '*';
	return Object.assign( handle, { attention, peek } );
}

/**
 * Builds the emphasis and strong handlers.
 *
 * @param strict See {@link createHandler}.
 * @return The handlers.
 */
function createHandlers( strict: boolean ): Partial< Handlers > {
	return Object.fromEntries(
		MARKED_TYPES.map( ( type ) => [ type, createHandler( type, strict ) ] )
	);
}

/**
 * remark-stringify handlers that restore the original emphasis and strong
 * markers recorded by {@link annotateInlineMarker}.
 *
 * Nodes without a recorded marker fall back to the default, so text formatted
 * in the editor is written with `*` and `**`.
 *
 * Only that one marker is offered, so the output can fail to parse back as the
 * same nodes, as with adjacent emphasis (`*a**b*`). Check the output with
 * {@link hasSameAttention} and write it again with
 * {@link inlineMarkerFallbackHandlers} when it does not match.
 */
export const inlineMarkerHandlers = createHandlers( true );

/**
 * Like {@link inlineMarkerHandlers}, but lets the serializer switch to the
 * other marker where the stored one would not parse back (`*a*_b_`).
 */
export const inlineMarkerFallbackHandlers = createHandlers( false );

/**
 * Lists the emphasis and strong nodes of a tree in document order, each with
 * its type and text, to compare whether two trees format the same text.
 *
 * @param node The node to walk.
 * @param out  The list to append to.
 * @return The list.
 */
function attentionSignature( node: Nodes, out: string[] = [] ): string[] {
	if ( node.type === 'emphasis' || node.type === 'strong' ) {
		out.push( `${ node.type }:${ textOf( node ) }` );
	}
	if ( 'children' in node ) {
		for ( const child of node.children ) {
			attentionSignature( child as Nodes, out );
		}
	}
	return out;
}

/**
 * Concatenates the literal text inside a node.
 *
 * @param node The node to read.
 * @return Its text.
 */
function textOf( node: Nodes ): string {
	if ( 'value' in node ) {
		return node.value;
	}
	return 'children' in node
		? node.children.map( ( child ) => textOf( child as Nodes ) ).join( '' )
		: '';
}

/**
 * Whether a tree contains any emphasis or strong node.
 *
 * @param node The node to check.
 * @return `true` when it does.
 */
export function hasAttention( node: Nodes ): boolean {
	return attentionSignature( node ).length > 0;
}

/**
 * Whether two trees have the same emphasis and strong nodes around the same
 * text, ignoring the markers they are written with.
 *
 * @param expected The tree that was serialized.
 * @param actual   The tree parsed back from the output.
 * @return `true` when they match.
 */
export function hasSameAttention( expected: Nodes, actual: Nodes ): boolean {
	const a = attentionSignature( expected );
	const b = attentionSignature( actual );
	return a.length === b.length && a.every( ( value, i ) => value === b[ i ] );
}
