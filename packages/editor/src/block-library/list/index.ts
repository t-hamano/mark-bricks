/**
 * WordPress dependencies
 */
import type { BlockConfiguration } from '@wordpress/blocks';
import * as list from '@wordpress/block-library/build-module/list/index.mjs';

/**
 * Internal dependencies
 */
import Edit from './edit';

export const { name, metadata } = list;

export const settings: Partial< BlockConfiguration > = {
	...list.settings,
	attributes: {
		...list.metadata.attributes,
		markdownData: {
			type: 'object',
			default: {
				marker: '-',
				spread: false,
				spacing: 1,
			},
		},
	},
	edit: Edit as BlockConfiguration[ 'edit' ],
};
