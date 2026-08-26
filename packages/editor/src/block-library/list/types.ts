/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';

export type ListMarker =
	// Unordered bullet: `- item`
	| '-'
	// Unordered bullet: `* item`
	| '*'
	// Unordered bullet: `+ item`
	| '+'
	// Ordered delimiter, period: `1. item`
	| '.'
	// Ordered delimiter, parenthesis: `1) item`
	| ')';

export type BlockAttributes = Block[ 'attributes' ] & {
	ordered?: boolean;
	start?: number;
	markdownData: {
		marker: ListMarker;
		spread: boolean;
		// Spaces between the marker and the content, from 1 to 4.
		spacing: number;
	};
};
