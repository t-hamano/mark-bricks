/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { IMAGE_TITLE_QUOTE_ATTRIBUTE } from '../converter/source-syntax/attributes';

const name = 'core/image';
const title = () => __( 'Inline image', 'mark-bricks' );

/**
 * An image inside a block's inline content, e.g. `Text ![alt](image.png)` or
 * the badge `[![alt](badge.svg)](https://example.com)`.
 *
 * It is an object format, so RichText keeps the `<img>` as a single
 * replacement character rather than a span of formatted text.
 */
export const image = {
	name,
	title,
	tagName: 'img',
	className: null,
	attributes: {
		url: 'src',
		alt: 'alt',
		title: 'title',
		titleQuote: IMAGE_TITLE_QUOTE_ATTRIBUTE,
	},
	interactive: false,
	object: true,
};
