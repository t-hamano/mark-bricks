/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';
import type { RichTextData } from '@wordpress/rich-text';

export type BlockAttributes = Block[ 'attributes' ] & {
	content?: string | RichTextData;
	markdownData?: {
		// - `undefined` — an ordinary list item (no checkbox).
		// - `false`     — a task item, unchecked (`- [ ]`).
		// - `true`      — a task item, checked (`- [x]`).
		checked?: boolean;
	};
};
