/**
 * WordPress dependencies
 */
import { insertObject, type RichTextValue } from '@wordpress/rich-text';

/**
 * Internal dependencies
 */
import type { ImageValue } from './inline';

/**
 * The name the inline image format is registered under.
 */
export const IMAGE_FORMAT = 'core/image';

/**
 * The format shape `insertObject` takes. It accepts attributes at runtime; the
 * public type omits them.
 */
type InsertedObject = Parameters< typeof insertObject >[ 1 ];

/**
 * Builds the format attributes for an image, keeping any others it already
 * carries, such as the title's delimiter. A cleared title drops them both.
 *
 * @param image    The image as the popover left it.
 * @param existing Attributes the image already carries.
 * @return The attributes to store.
 */
function toAttributes(
	image: ImageValue,
	existing: Record< string, string > = {}
): Record< string, string > {
	const attributes: Record< string, string > = {
		...existing,
		url: image.url,
		alt: image.alt,
	};
	if ( image.title ) {
		attributes.title = image.title;
	} else {
		delete attributes.title;
		delete attributes.titleQuote;
	}
	return attributes;
}

/**
 * Inserts an image at the selection, replacing any selected text.
 *
 * @param value RichText value carrying the selection.
 * @param image The image to insert.
 * @return The updated value.
 */
export function insertImage(
	value: RichTextValue,
	image: ImageValue
): RichTextValue {
	return insertObject( value, {
		type: IMAGE_FORMAT,
		attributes: toAttributes( image ),
	} as unknown as InsertedObject );
}

/**
 * Updates the image the selection is on.
 *
 * @param value    RichText value whose selection starts on the image.
 * @param image    The image as the popover left it.
 * @param existing Attributes the image already carries.
 * @return The updated value.
 */
export function updateImage(
	value: RichTextValue,
	image: ImageValue,
	existing: Record< string, string >
): RichTextValue {
	const replacements = value.replacements.slice();
	replacements[ value.start ] = {
		type: IMAGE_FORMAT,
		attributes: toAttributes( image, existing ),
	} as ( typeof replacements )[ number ];
	return { ...value, replacements };
}
