/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';
import type { RichTextData } from '@wordpress/rich-text';

export type BlockAttributes = Block[ 'attributes' ] & {
	// Inline content of the `<summary>` element. Absent when the Markdown
	// `<details>` element carries no `<summary>` child.
	summary?: string | RichTextData;
	// Mirrors the `open` attribute of the `<details>` element.
	showContent?: boolean;
};
