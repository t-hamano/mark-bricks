/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import type { TitleQuote } from '../../converter/source-syntax/types';

export type BlockAttributes = Block[ 'attributes' ] & {
	url: string;
	alt: string;
	title?: string;
	markdownData?: {
		titleQuote?: TitleQuote;
	};
};
