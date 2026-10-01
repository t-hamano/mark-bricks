/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';

export type MathFormat =
	// Dollar-fenced block: `$$ ... $$`
	| 'dollar'
	// Backtick-fenced math code block: ```` ```math ... ``` ````
	| 'fenced-backtick'
	// Tilde-fenced math code block: `~~~math ... ~~~`
	| 'fenced-tilde';

export type BlockAttributes = Block[ 'attributes' ] & {
	latex?: string;
	mathML?: string;
	markdownData?: {
		format: MathFormat;
		// Text after the opening fence: `$$ meta` or ```` ```math meta ````
		meta?: string;
	};
};
