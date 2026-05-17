/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';
import type { RichTextData } from '@wordpress/rich-text';

export type CodeFormat =
	// Backtick-fenced block: ```` ```lang ... ``` ````
	| 'fenced-backtick'
	// Tilde-fenced block: `~~~lang ... ~~~`
	| 'fenced-tilde'
	// Indented block: each line prefixed with 4 spaces (or 1 tab)
	| 'indented';

export type BlockAttributes = Block[ 'attributes' ] & {
	content?: string | RichTextData;
	markdownData: {
		format: CodeFormat;
		language?: string;
	};
};
