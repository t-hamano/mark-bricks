/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';

export type SeparatorMarker =
	// Dash thematic break: `---`
	| '-'
	// Asterisk thematic break: `***`
	| '*'
	// Underscore thematic break: `___`
	| '_';

export type SeparatorFormat = {
	marker: SeparatorMarker;
	repetition: number;
	spaces: boolean;
};

export type BlockAttributes = Block[ 'attributes' ] & {
	markdownData: {
		format: SeparatorFormat;
	};
};
