/**
 * External dependencies
 */
import type { RefObject } from 'react';

/**
 * WordPress dependencies
 */
import type { RichTextValue } from '@wordpress/rich-text';

export type FormatEditProps = {
	isActive: boolean;
	activeAttributes: Record< string, string >;
	value: RichTextValue;
	onChange: ( value: RichTextValue ) => void;
	onFocus: () => void;
	contentRef: RefObject< HTMLElement >;
};
