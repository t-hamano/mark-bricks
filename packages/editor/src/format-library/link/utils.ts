/**
 * WordPress dependencies
 */
import {
	applyFormat,
	getTextContent,
	insert,
	slice,
	type RichTextValue,
} from '@wordpress/rich-text';

/**
 * Internal dependencies
 */
export { LINK_SYNTAX_ATTRIBUTE } from '../../block-library/utils';

/**
 * The name the link format is registered under.
 */
export const LINK_FORMAT = 'core/link';

/**
 * The tag a link is stored as, which is also what the popover anchors to.
 */
export const LINK_TAG_NAME = 'a';

/**
 * A link as the popover edits it.
 *
 * `text` is what the link reads as, `url` where it points, and `title` the
 * tooltip Markdown writes as `[text](url "title")`.
 */
export type LinkValue = {
	text: string;
	url: string;
	title: string;
};

/**
 * The half-open range of text a format covers.
 */
type Boundary = {
	start: number;
	end: number;
};

/**
 * The format shape `applyFormat` takes. It accepts attributes at runtime; the
 * public type omits them.
 */
type AppliedFormat = Parameters< typeof applyFormat >[ 1 ];

/**
 * Finds the range of text the link under the selection covers.
 *
 * The selection says where the caret is, not where the link it sits in begins
 * and ends, so the range has to be walked out from the caret to both edges.
 * Formats are stored per character as shared object references, and it is that
 * identity — not the URL, which two neighbouring links may well share — that
 * marks the characters belonging to one and the same link.
 *
 * @param value RichText value carrying the selection.
 * @return The link's range, or `undefined` when the selection is not on a link.
 */
export function getFormatBoundary(
	value: RichTextValue
): Boundary | undefined {
	const { formats, start, end } = value;
	const format = formats[ start ]?.find(
		( { type } ) => type === LINK_FORMAT
	);
	if ( ! format ) {
		return undefined;
	}

	let from = start;
	while ( formats[ from - 1 ]?.includes( format ) ) {
		from--;
	}
	let to = end;
	while ( formats[ to ]?.includes( format ) ) {
		to++;
	}
	return { start: from, end: to };
}

/**
 * Reads the link the selection sits on.
 *
 * @param value      RichText value carrying the selection.
 * @param attributes Attributes of the active link format, if any.
 * @param isActive   Whether the selection is on a link.
 * @return The link, with the selected text standing in as the text of a link
 *         that does not exist yet.
 */
export function getLinkValue(
	value: RichTextValue,
	attributes: Record< string, string >,
	isActive: boolean
): LinkValue {
	const { start, end } = ( isActive && getFormatBoundary( value ) ) || value;
	return {
		text: getTextContent( slice( value, start, end ) ),
		url: attributes.url ?? '',
		title: attributes.title ?? '',
	};
}

/**
 * Builds the format a link is written with.
 *
 * The format carries only what the popover edits, so applying it drops the
 * syntax the source recorded for a link written as a bare URL or an autolink.
 * That is what turns `https://example.com` into `[text](https://example.com)`
 * the moment the link is first edited: neither of the shorter forms can hold a
 * text or a title that differs from the URL.
 *
 * @param link       The link being written.
 * @param link.url   Where the link points.
 * @param link.title The tooltip the link carries, if any.
 * @return The format to apply.
 */
function createLinkFormat( { url, title }: LinkValue ): AppliedFormat {
	const attributes: Record< string, string > = { url };
	if ( title ) {
		attributes.title = title;
	}
	return { type: LINK_FORMAT, attributes } as unknown as AppliedFormat;
}

/**
 * Writes a link back into a RichText value.
 *
 * @param value    RichText value carrying the selection.
 * @param isActive Whether the selection is on the link being written.
 * @param link     The link as the popover left it.
 * @return The updated value.
 */
export function setLink(
	value: RichTextValue,
	isActive: boolean,
	link: LinkValue
): RichTextValue {
	const { start, end } = ( isActive && getFormatBoundary( value ) ) || value;
	const format = createLinkFormat( link );
	// A link given no text of its own reads as the URL it points to.
	const text = link.text || link.url;

	// Laying the format over the text as it stands keeps whatever formatting
	// sits inside the link, which rewriting the text cannot.
	if ( text === getTextContent( slice( value, start, end ) ) ) {
		return applyFormat( value, format, start, end );
	}

	// `insert` drops whatever lies between the two indices, so the one call
	// covers writing over a selection, over the text of an existing link, and
	// into a bare caret alike.
	return applyFormat(
		insert( value, text, start, end ),
		format,
		start,
		start + text.length
	);
}
