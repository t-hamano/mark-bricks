/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';

/**
 * The delimiter used for an image title in the Markdown source.
 *
 * CommonMark allows `"…"`, `'…'`, and `(…)`. remark-stringify can only emit
 * the first two, so the parenthesised form is degraded to a double quote.
 */
export type TitleQuote = '"' | "'";

export type BlockAttributes = Block[ 'attributes' ] & {
	url: string;
	alt: string;
	title?: string;
	markdownData?: {
		titleQuote?: TitleQuote;
	};
};
