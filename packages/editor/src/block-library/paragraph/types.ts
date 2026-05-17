/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';

export type BlockAttributes = Block[ 'attributes' ] & {
	content?: string;
};
