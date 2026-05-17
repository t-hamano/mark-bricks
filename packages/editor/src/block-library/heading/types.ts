/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type BlockAttributes = Block[ 'attributes' ] & {
	content?: string;
	level: number;
	markdownData?: { format: 'setext' | 'atx' };
};
