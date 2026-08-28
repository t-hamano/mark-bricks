/**
 * External dependencies
 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { defaultHandlers } from 'mdast-util-to-markdown';
import type { Handle, State } from 'mdast-util-to-markdown';
import type { Link, Nodes, Parents, PhrasingContent, Root } from 'mdast';

/**
 * Internal dependencies
 */
import type { LinkSyntax } from '../block-library/utils';

/**
 * Parser the candidate literals are verified against.
 *
 * Frozen once, since a document is re-serialized on every block change.
 */
const parser = unified().use( remarkParse ).use( remarkGfm ).freeze();

/**
 * Constructs GFM does not detect autolink literals inside. A link written in
 * one of them has to keep its explicit syntax, since the bare URL would read
 * as plain text there.
 */
const OPAQUE_CONSTRUCTS = [ 'autolink', 'image', 'label', 'link' ];

/**
 * Detects the syntax a link was written with in the Markdown source.
 *
 * A link whose text is its own URL can be written in three interchangeable
 * forms, told apart only by the character they open with:
 *
 * ```md
 * [https://example.com](https://example.com)
 * <https://example.com>
 * https://example.com
 * ```
 *
 * The resource link is the form the serializer falls back to, so it is left
 * unrecorded.
 *
 * @param node   mdast Link node from remark-parse.
 * @param source The original markdown source.
 * @return The detected syntax, or `undefined` for a resource link and for a
 *         node whose position is unknown.
 */
function detectSyntax( node: Link, source: string ): LinkSyntax | undefined {
	const offset = node.position?.start.offset;
	const char = offset === undefined ? undefined : source[ offset ];
	if ( char === undefined || char === '[' ) {
		return undefined;
	}
	return char === '<' ? 'autolink' : 'literal';
}

/**
 * Records on the parsed tree which syntax each link was written with.
 *
 * The three forms render identically and therefore parse to the same Link
 * node, so by the time the tree is serialized again `https://example.com` is
 * indistinguishable from the `[https://example.com](https://example.com)` it
 * may have been written as. The form is detected from `source` and stored on
 * `node.data` before the tree is converted to blocks. From there
 * `inlineToContent` carries it into the block's inline content, and
 * {@link linkHandler} restores it on the way out.
 *
 * The tree is annotated in place, since the converters walk the very same
 * nodes.
 *
 * @param tree   mdast tree from remark-parse.
 * @param source The original markdown source.
 */
export function annotateLinkSyntax( tree: Nodes, source: string ): void {
	if ( tree.type === 'link' ) {
		const syntax = detectSyntax( tree, source );
		if ( syntax ) {
			tree.data = { ...tree.data, syntax };
		}
	}
	if ( 'children' in tree ) {
		for ( const child of tree.children ) {
			annotateLinkSyntax( child as Nodes, source );
		}
	}
}

/**
 * Reads the syntax stored on a node by {@link annotateLinkSyntax}.
 *
 * @param node mdast Link node being serialized.
 * @return The syntax, or `undefined` when the node carries none.
 */
function nodeSyntax( node: Link ): LinkSyntax | undefined {
	const syntax = node.data?.syntax;
	return syntax === 'literal' || syntax === 'autolink' ? syntax : undefined;
}

/**
 * Asserts that the next node is a text node holding exactly `value`, removing
 * it from the list.
 *
 * @param nodes Remaining phrasing content; the matched node is shifted off.
 * @param value The text the node must hold.
 * @return Whether the node matched.
 */
function shiftText( nodes: PhrasingContent[], value: string ): boolean {
	const node = nodes.shift();
	return node?.type === 'text' && node.value === value;
}

/**
 * Checks that a bare URL, written between the given characters, is read back
 * as the very same link.
 *
 * @param before  The character preceding the literal, or an empty string when
 *                the literal starts a text node.
 * @param literal The bare URL.
 * @param after   The character following the literal, or an empty string when
 *                the literal ends a text node.
 * @param url     The URL the literal has to resolve to.
 * @return Whether GFM finds the same link again.
 */
function readsAsLiteral(
	before: string,
	literal: string,
	after: string,
	url: string
): boolean {
	const tree = parser.parse( before + literal + after ) as Root;
	const [ paragraph, ...rest ] = tree.children;
	if ( rest.length > 0 || paragraph?.type !== 'paragraph' ) {
		return false;
	}
	const nodes = [ ...paragraph.children ];
	if ( before && ! shiftText( nodes, before ) ) {
		return false;
	}
	const link = nodes.shift();
	if (
		link?.type !== 'link' ||
		link.url !== url ||
		link.title ||
		link.children.length !== 1 ||
		link.children[ 0 ].type !== 'text' ||
		link.children[ 0 ].value !== literal
	) {
		return false;
	}
	if ( after && ! shiftText( nodes, after ) ) {
		return false;
	}
	return nodes.length === 0;
}

/**
 * Renders a Link node as the GFM autolink literal it was written as, i.e. the
 * bare URL.
 *
 * The bare form is only used when GFM is guaranteed to find the link again.
 * The literal is re-parsed together with the characters that will surround it,
 * which are read off the sibling text nodes rather than off the serialized
 * output: markup around the literal (an emphasis marker, a hard break, the
 * start of the parent) ends the text node the literal lives in, and so cannot
 * take part in its detection. Whitespace is dropped for the same reason —
 * GFM only requires the literal to start a text node or to follow whitespace
 * or punctuation, which the start of the probe stands for.
 *
 * A link GFM would read differently — a host it does not recognize, a URL cut
 * short at a trailing `)`, one glued to the word after it — keeps an explicit
 * syntax.
 *
 * @param node   mdast Link node.
 * @param parent Parent of the node, holding the surrounding siblings.
 * @param state  Serialization state, read for the enclosing constructs.
 * @return The bare URL, or `null` when the link cannot be written as one.
 */
function toLiteral(
	node: Link,
	parent: Parents | undefined,
	state: State
): string | null {
	if ( node.title || node.children.length !== 1 ) {
		return null;
	}
	const [ child ] = node.children;
	if ( child.type !== 'text' ) {
		return null;
	}
	const literal = child.value;
	if (
		node.url !== literal &&
		node.url !== `http://${ literal }` &&
		node.url !== `mailto:${ literal }`
	) {
		return null;
	}
	if (
		state.stack.some( ( construct ) =>
			OPAQUE_CONSTRUCTS.includes( construct )
		)
	) {
		return null;
	}
	// A table cell escapes `|`, which a bare URL cannot be.
	if ( state.stack.includes( 'tableCell' ) && literal.includes( '|' ) ) {
		return null;
	}
	const siblings = ( parent?.children ?? [] ) as PhrasingContent[];
	const index = siblings.indexOf( node );
	const previous = index > 0 ? siblings[ index - 1 ] : undefined;
	const next = index === -1 ? undefined : siblings[ index + 1 ];
	const before = previous?.type === 'text' ? previous.value.slice( -1 ) : '';
	const after = next?.type === 'text' ? next.value.charAt( 0 ) : '';
	return readsAsLiteral(
		/\s/.test( before ) ? '' : before,
		literal,
		/\s/.test( after ) ? '' : after,
		node.url
	)
		? literal
		: null;
}

/**
 * Runs the default handler with the autolink form disabled, so that a link
 * whose text is its own URL still comes out as `[text](url)`.
 *
 * `options.resourceLink` is document-wide, so a per-node choice cannot be
 * expressed through it. The default handler reads the option from
 * `state.options` at the top of each call, so it is swapped for the duration
 * of that call and restored afterwards.
 *
 * @param node   mdast Link node.
 * @param parent Parent of the node.
 * @param state  Serialization state.
 * @param info   Serialization info.
 * @return The link written as a resource link.
 */
const asResource: Handle = ( node, parent, state, info ) => {
	const previous = state.options.resourceLink;
	state.options.resourceLink = true;
	try {
		return defaultHandlers.link( node, parent, state, info );
	} finally {
		state.options.resourceLink = previous;
	}
};

const link: Handle = ( node, parent, state, info ) => {
	const syntax = nodeSyntax( node );
	if ( syntax === 'literal' ) {
		const literal = toLiteral( node, parent, state );
		if ( literal !== null ) {
			return literal;
		}
	}
	// A literal GFM would no longer detect falls back to the default handler,
	// which writes the autolink — the shortest form that survives.
	return syntax
		? defaultHandlers.link( node, parent, state, info )
		: asResource( node, parent, state, info );
};

const peek: Handle = ( node, parent, state ) => {
	const syntax = nodeSyntax( node );
	if ( syntax === 'literal' ) {
		const literal = toLiteral( node, parent, state );
		if ( literal !== null ) {
			return literal;
		}
	}
	return syntax ? defaultHandlers.link.peek( node, parent, state ) : '[';
};

/**
 * remark-stringify handler for Link nodes, writing each one back in the syntax
 * {@link annotateLinkSyntax} recorded for it.
 *
 * GFM links a URL written on its own — `https://example.com`,
 * `www.example.com` or `user@example.com` — and such a literal parses to the
 * same Link node as the `<https://example.com>` autolink and the
 * `[https://example.com](https://example.com)` resource link. The default
 * handler would write all three as the autolink, so the recorded syntax
 * decides instead.
 *
 * A link carrying no syntax — written as a resource link, or created in the
 * editor — is written as a resource link, the one form that holds every link.
 */
export const linkHandler = Object.assign( link, { peek } );
