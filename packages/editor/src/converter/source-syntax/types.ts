/**
 * The marker characters CommonMark accepts for emphasis and strong emphasis.
 */
export type InlineMarker = '*' | '_';

/**
 * The syntaxes a link can be written in, minus the resource link
 * (`[text](url)`) which is the form every link falls back to.
 */
export type LinkSyntax = 'literal' | 'autolink';

/**
 * The delimiter used for an image title in the Markdown source.
 *
 * CommonMark allows `"…"`, `'…'`, and `(…)`. remark-stringify can only emit
 * the first two, so the parenthesised form is degraded to a double quote.
 */
export type TitleQuote = '"' | "'";

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
	interface ImageData {
		titleQuote?: TitleQuote;
	}
}
