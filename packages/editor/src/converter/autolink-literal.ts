/**
 * External dependencies
 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { defaultHandlers } from 'mdast-util-to-markdown';
import type { Handle, State } from 'mdast-util-to-markdown';
import type { Link, Parents, PhrasingContent, Root } from 'mdast';

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
 * GFM links a URL written on its own — `https://example.com`,
 * `www.example.com` or `user@example.com`. Such a literal parses to the same
 * Link node as the `<https://example.com>` autolink, so remark-stringify
 * writes every one of them as an autolink and the bare form is lost.
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
 * short at a trailing `)`, one glued to the word after it — keeps the explicit
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

const link: Handle = ( node, parent, state, info ) =>
	toLiteral( node, parent, state ) ??
	defaultHandlers.link( node, parent, state, info );

const peek: Handle = ( node, parent, state ) =>
	toLiteral( node, parent, state ) ??
	defaultHandlers.link.peek( node, parent, state );

/**
 * remark-stringify handler for Link nodes, writing the ones that were an
 * autolink literal back as a bare URL and leaving every other link to the
 * default handler.
 */
export const linkHandler = Object.assign( link, { peek } );
