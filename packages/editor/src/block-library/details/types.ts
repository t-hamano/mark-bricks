/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';
import type { RichTextData } from '@wordpress/rich-text';

export type BlockAttributes = Block[ 'attributes' ] & {
	summary?: string | RichTextData;
	showContent?: boolean;
};
