/**
 * External dependencies
 */
import { fromHtml } from 'hast-util-from-html';
import type { Element, RootContent } from 'hast';
import type { PhrasingContent } from 'mdast';

/**
 * WordPress dependencies
 */
import { escapeAttribute, escapeHTML } from '@wordpress/escape-html';
import { RichTextData } from '@wordpress/rich-text';

/**
 * The marker characters CommonMark accepts for emphasis and strong emphasis.
 */
export type InlineMarker = '*' | '_';

/**
 * The syntaxes a link can be written in, minus the resource link
 * (`[text](url)`) which is the form every link falls back to.
 */
export type LinkSyntax = 'literal' | 'autolink';

declare module 'mdast' {
	interface EmphasisData {
		marker?: InlineMarker;
	}
	interface StrongData {
		marker?: InlineMarker;
	}
	interface LinkData {
		syntax?: LinkSyntax;
	}
}

/**
 * The attribute that carries a non-default marker through a block's inline
 * content. `*` is the default and is therefore never written out.
 */
const MARKER_ATTRIBUTE = 'data-markdown-marker';

/**
 * The `hast` property name `hast-util-from-html` derives from
 * {@link MARKER_ATTRIBUTE}.
 */
const MARKER_PROPERTY = 'dataMarkdownMarker';

/**
 * Reads the marker an element carries, if any.
 *
 * @param node hast element.
 * @return The marker, or `undefined` when the element carries none.
 */
function readMarker( node: Element ): InlineMarker | undefined {
	return node.properties?.[ MARKER_PROPERTY ] === '_' ? '_' : undefined;
}

/**
 * Renders the marker attribute for a node that carries a non-default marker.
 *
 * @param marker The node's marker, if any.
 * @return The attribute to insert into the opening tag, or an empty string.
 */
function writeMarker( marker: InlineMarker | undefined ): string {
	return marker === '_' ? ` ${ MARKER_ATTRIBUTE }="_"` : '';
}

/**
 * The attribute that carries a link's syntax through a block's inline content.
 * The resource link is the default and is therefore never written out.
 */
export const LINK_SYNTAX_ATTRIBUTE = 'data-markdown-link';

/**
 * The `hast` property name `hast-util-from-html` derives from
 * {@link LINK_SYNTAX_ATTRIBUTE}.
 */
const LINK_SYNTAX_PROPERTY = 'dataMarkdownLink';

/**
 * Reads the link syntax an element carries, if any.
 *
 * @param node hast element.
 * @return The syntax, or `undefined` when the element carries none.
 */
function readLinkSyntax( node: Element ): LinkSyntax | undefined {
	const syntax = node.properties?.[ LINK_SYNTAX_PROPERTY ];
	return syntax === 'literal' || syntax === 'autolink' ? syntax : undefined;
}

/**
 * Renders the syntax attribute for a link that was not a resource link.
 *
 * @param syntax The link's syntax, if any.
 * @return The attribute to insert into the opening tag, or an empty string.
 */
function writeLinkSyntax( syntax: LinkSyntax | undefined ): string {
	return syntax ? ` ${ LINK_SYNTAX_ATTRIBUTE }="${ syntax }"` : '';
}

/**
 * Flattens phrasing content to plain text, discarding all formatting.
 *
 * Used to derive the value of an `inlineCode` node, whose mdast representation
 * is a single string and so cannot hold nested formatting.
 *
 * @param nodes mdast phrasing content.
 * @return The concatenated text.
 */
function flattenText( nodes: PhrasingContent[] ): string {
	return nodes
		.map( ( node ) => {
			if ( node.type === 'text' || node.type === 'inlineCode' ) {
				return node.value;
			}
			if ( node.type === 'break' ) {
				return '\n';
			}
			if ( 'children' in node ) {
				return flattenText( node.children as PhrasingContent[] );
			}
			return '';
		} )
		.join( '' );
}

/**
 * Maps hast nodes to the mdast phrasing content blocks can store.
 *
 * Only the tags the `format-library` formats register are recognized; an
 * unrecognized element is unwrapped, so its text survives. Parsing — including
 * nesting and HTML character references — is handled upstream by
 * `hast-util-from-html`, so this is a straight tree-to-tree mapping.
 *
 * @param nodes hast nodes, the children of a root or element node.
 * @return mdast phrasing content.
 */
function hastToPhrasing( nodes: RootContent[] ): PhrasingContent[] {
	const result: PhrasingContent[] = [];
	for ( const node of nodes ) {
		if ( node.type === 'text' ) {
			result.push( { type: 'text', value: node.value } );
			continue;
		}
		if ( node.type !== 'element' ) {
			// Comments and doctypes carry no inline content.
			continue;
		}
		const children = hastToPhrasing( node.children );
		switch ( node.tagName ) {
			case 'br':
				result.push( { type: 'break' } );
				break;
			case 'em':
			case 'i':
				if ( children.length > 0 ) {
					const marker = readMarker( node );
					result.push( {
						type: 'emphasis',
						children,
						...( marker ? { data: { marker } } : {} ),
					} );
				}
				break;
			case 'strong':
			case 'b':
				if ( children.length > 0 ) {
					const marker = readMarker( node );
					result.push( {
						type: 'strong',
						children,
						...( marker ? { data: { marker } } : {} ),
					} );
				}
				break;
			case 's':
			case 'del':
			case 'strike':
				if ( children.length > 0 ) {
					result.push( { type: 'delete', children } );
				}
				break;
			case 'code': {
				const value = flattenText( children );
				if ( value ) {
					result.push( { type: 'inlineCode', value } );
				}
				break;
			}
			case 'a':
				if ( children.length > 0 ) {
					const href = node.properties?.href;
					const title = node.properties?.title;
					const syntax = readLinkSyntax( node );
					result.push( {
						type: 'link',
						url: typeof href === 'string' ? href : '',
						title:
							typeof title === 'string' && title ? title : null,
						children,
						...( syntax ? { data: { syntax } } : {} ),
					} );
				}
				break;
			default:
				// Unknown tag: drop the wrapper, keep its inline content.
				result.push( ...children );
		}
	}
	return result;
}

/**
 * Serializes mdast phrasing content into a block's inline content.
 *
 * Text is HTML-escaped, hard `break` nodes become `<br>`, and the supported
 * inline formats become the HTML tags their `format-library` format registers:
 *
 * - `emphasis`    → `<em>`
 * - `strong`      → `<strong>`
 * - `delete`      → `<s>`
 * - `link`        → `<a href>`
 * - `inlineCode`  → `<code>`
 *
 * Any other node type is dropped, since blocks only store these formats.
 *
 * @param children mdast phrasing content, e.g. the children of a Paragraph
 *                 or Heading node.
 * @return The block's inline content as a RichText HTML string.
 */
export function inlineToContent( children: PhrasingContent[] ): string {
	return children
		.map( ( node ): string => {
			switch ( node.type ) {
				case 'text':
					return escapeHTML( node.value );
				case 'break':
					return '<br>';
				case 'inlineCode':
					return `<code>${ escapeHTML( node.value ) }</code>`;
				case 'emphasis':
					return `<em${ writeMarker(
						node.data?.marker
					) }>${ inlineToContent( node.children ) }</em>`;
				case 'strong':
					return `<strong${ writeMarker(
						node.data?.marker
					) }>${ inlineToContent( node.children ) }</strong>`;
				case 'delete':
					return `<s>${ inlineToContent( node.children ) }</s>`;
				case 'link': {
					const href = escapeAttribute( node.url );
					const title = node.title
						? ` title="${ escapeAttribute( node.title ) }"`
						: '';
					const syntax = writeLinkSyntax( node.data?.syntax );
					return `<a href="${ href }"${ title }${ syntax }>${ inlineToContent(
						node.children
					) }</a>`;
				}
				default:
					// Phrasing types with no block representation (e.g.
					// `image`, inline `html`, reference links) are dropped.
					return '';
			}
		} )
		.join( '' );
}

/**
 * Parses a block's inline content into mdast phrasing content.
 *
 * The inverse of {@link inlineToContent}: the RichText HTML string is parsed
 * with `hast-util-from-html` and the resulting tree is mapped to mdast phrasing
 * by {@link hastToPhrasing}. The parser is lenient — malformed markup and
 * unknown tags degrade gracefully rather than throwing.
 *
 * An empty `text` node is returned when there is no content, so the result
 * always has at least one child.
 *
 * @param content The block's inline content as a RichText HTML string.
 * @return mdast phrasing content for a Paragraph or Heading node.
 */
export function contentToInline( content: string ): PhrasingContent[] {
	const tree = fromHtml( content, { fragment: true } );
	const children = hastToPhrasing( tree.children );
	if ( children.length === 0 ) {
		children.push( { type: 'text', value: '' } );
	}
	return children;
}

/**
 * Normalizes a block's stored inline content to a RichText HTML string.
 *
 * Gutenberg stores a `rich-text` attribute as a RichTextData instance
 * once the block has been edited, but converters and tests also pass a plain
 * string. Both are reduced to the HTML string {@link contentToInline} expects.
 *
 * @param content The raw stored inline-content value.
 * @return The inline content as an HTML string.
 */
export function richTextToString(
	content: string | RichTextData | undefined
): string {
	if ( content instanceof RichTextData ) {
		return content.toHTMLString();
	}
	return content ?? '';
}
