/**
 * External dependencies
 */
import type { List, ListItem } from 'mdast';
import type { Options } from 'remark-stringify';

type ListItemHandle = NonNullable<
	NonNullable< Options[ 'handlers' ] >[ 'listItem' ]
>;

declare module 'mdast' {
	interface ListData {
		/**
		 * Spaces between the marker and the content, from 1 to 4.
		 *
		 * Attached to the List node by `buildListNode` so that
		 * {@link listItemHandler} can restore the spacing of each list
		 * separately. remark ignores unknown `data` fields.
		 */
		spacing?: number | undefined;
	}
}

/**
 * The number of spaces CommonMark implies when none is preserved.
 */
export const DEFAULT_SPACING = 1;

/**
 * CommonMark allows one to four spaces between the marker and the content;
 * five or more turn the content into an indented code block.
 */
const MAX_SPACING = 4;

/**
 * Matches a list marker followed by the spaces that separate it from the
 * content. An ordered marker holds at most nine digits, per CommonMark.
 */
const MARKER_PATTERN = /^(?:[-*+]|\d{1,9}[.)])( +)/;

/**
 * The longest prefix {@link MARKER_PATTERN} can match: nine digits, a
 * delimiter, and four spaces.
 */
const MARKER_MAX_LENGTH = 14;

/**
 * Clamps a stored or detected spacing to the range CommonMark allows.
 *
 * @param value Spacing to normalize; anything but a number falls back to the
 *              default.
 * @return Spacing between 1 and 4.
 */
export function normalizeSpacing( value: unknown ): number {
	if ( typeof value !== 'number' || ! Number.isFinite( value ) ) {
		return DEFAULT_SPACING;
	}
	return Math.min(
		Math.max( Math.round( value ), DEFAULT_SPACING ),
		MAX_SPACING
	);
}

/**
 * Detects how many spaces separate the marker from the content.
 *
 * The mdast List node carries no syntactic detail, so the first item's
 * `position` is used to slice the marker out of the source. A tab (which
 * CommonMark expands to the next tab stop) is not preserved and falls back to
 * the default.
 *
 * @param node   mdast List node from remark-parse.
 * @param source The original markdown source.
 * @return The detected spacing, or the default when it cannot be determined.
 */
export function detectSpacing( node: List, source: string ): number {
	const offset = node.children[ 0 ]?.position?.start.offset;
	if ( offset === undefined ) {
		return DEFAULT_SPACING;
	}
	const match = source
		.slice( offset, offset + MARKER_MAX_LENGTH )
		.match( MARKER_PATTERN );
	if ( ! match ) {
		return DEFAULT_SPACING;
	}
	return normalizeSpacing( match[ 1 ].length );
}

/**
 * remark-stringify handler that emits a `listItem` with the spacing stored on
 * its parent List node.
 *
 * remark-stringify only exposes the global `listItemIndent` option, which is
 * limited to a single space (`one`) or a tab stop (`tab`), and applies to
 * every list in the tree. Preserving one to four spaces per list therefore
 * requires taking over the handler: the spacing travels on the parent List
 * node as `data.spacing` (see `buildListNode`), so nested lists can each keep
 * their own.
 *
 * The handler replaces both the built-in `listItem` handler and the one
 * remark-gfm installs for task items — user handlers are applied after
 * extensions — so the `[ ]` / `[x]` checkbox is emitted here as well.
 *
 * Everything else mirrors the built-in handler: the ordered marker counts up
 * from the list's `start`, and continuation lines are indented to the content
 * column so that nested blocks stay inside the item.
 *
 * @param node   mdast ListItem node to serialize.
 * @param parent Parent of `node`, i.e. the List node holding the spacing.
 * @param state  Serialization state passed by mdast-util-to-markdown.
 * @param info   Info on the surrounding of the node that is serialized.
 * @return The serialized list item.
 */
export const listItemHandler: ListItemHandle = (
	node: ListItem,
	parent,
	state,
	info
) => {
	const list = parent?.type === 'list' ? parent : undefined;
	let bullet = state.bulletCurrent || state.options.bullet || '*';
	if ( list?.ordered ) {
		const start =
			typeof list.start === 'number' && list.start > -1 ? list.start : 1;
		const index =
			state.options.incrementListMarker === false
				? 0
				: list.children.indexOf( node );
		bullet = `${ start + index }${ bullet }`;
	}

	// The content column: the marker plus the spaces that follow it.
	const size = bullet.length + normalizeSpacing( list?.data?.spacing );
	const padding = ' '.repeat( size - bullet.length );

	// A GFM task item carries a boolean `checked`. The checkbox is part of the
	// item's first paragraph, so it sits after the padding and does not shift
	// the content column.
	const head = node.children[ 0 ];
	const checkbox =
		typeof node.checked === 'boolean' && head?.type === 'paragraph'
			? `[${ node.checked ? 'x' : ' ' }] `
			: '';

	const tracker = state.createTracker( info );
	tracker.move( bullet + padding + checkbox );
	tracker.shift( size );
	const exit = state.enter( 'listItem' );
	const value = state.indentLines(
		state.containerFlow( node, tracker.current() ),
		map
	);
	exit();
	return value;

	function map( line: string, index: number, blank: boolean ): string {
		if ( index ) {
			return ( blank ? '' : ' '.repeat( size ) ) + line;
		}
		return ( blank ? bullet : bullet + padding + checkbox ) + line;
	}
};
