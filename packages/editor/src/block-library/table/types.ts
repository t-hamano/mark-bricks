/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';
import type { RichTextData } from '@wordpress/rich-text';

export type Cell = {
	content?: string | RichTextData;
	tag: 'td' | 'th';
	align?: 'left' | 'center' | 'right';
};

export type Row = {
	cells: Cell[];
};

export type BlockAttributes = Block[ 'attributes' ] & {
	head: Row[];
	body: Row[];
	foot: Row[];
};
