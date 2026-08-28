/**
 * External dependencies
 */
import type { Handlers } from 'mdast-util-to-markdown';
import type { Nodes } from 'mdast';

/**
 * Internal dependencies
 */
import { annotateInlineMarker, inlineMarkerHandlers } from './inline-marker';
import { annotateLinkSyntax, linkHandler } from './link';

/**
 * The per-node annotators every node is offered to. Each one recognizes the
 * node types it records a syntax for and ignores the rest.
 */
const annotators = [ annotateInlineMarker, annotateLinkSyntax ];

/**
 * Records on the parsed tree which of the interchangeable Markdown spellings
 * each node was written with.
 *
 * CommonMark and GFM let several constructs be written in more than one way —
 * `*emphasis*` or `_emphasis_`, a bare `https://example.com` or the
 * `[https://example.com](https://example.com)` that renders the same — and the
 * spellings parse to the same node. The choice therefore survives nowhere but
 * in the source, so it is read off `node.position` and stored on `node.data`
 * before the tree is taken apart into blocks. From there `inlineToContent`
 * carries it into the block's inline content, and {@link sourceSyntaxHandlers}
 * restores it on the way out.
 *
 * The tree is annotated in place, since the converters walk the very same
 * nodes.
 *
 * @param tree   mdast tree from remark-parse.
 * @param source The original markdown source.
 */
export function annotateSourceSyntax( tree: Nodes, source: string ): void {
	for ( const annotate of annotators ) {
		annotate( tree, source );
	}
	if ( 'children' in tree ) {
		for ( const child of tree.children ) {
			annotateSourceSyntax( child as Nodes, source );
		}
	}
}

/**
 * remark-stringify handlers that write each node back in the spelling
 * {@link annotateSourceSyntax} recorded for it.
 *
 * A node carrying no spelling was created in the editor rather than parsed, so
 * it is written in the form that holds every case: `*` and `**` for the inline
 * markers, `[text](url)` for a link.
 */
export const sourceSyntaxHandlers: Partial< Handlers > = {
	...inlineMarkerHandlers,
	link: linkHandler,
};
