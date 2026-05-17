/**
 * WordPress dependencies
 */
import type { BlockConfiguration } from '@wordpress/blocks';
import * as listItem from '@wordpress/block-library/build-module/list-item/index.mjs';

/**
 * Internal dependencies
 */
import Edit from './edit';

export const { name, metadata } = listItem;

export const settings: Partial< BlockConfiguration > = {
	...listItem.settings,
	attributes: {
		...listItem.metadata.attributes,
		markdownData: {
			type: 'object',
			default: {},
		},
	},
	edit: Edit as BlockConfiguration[ 'edit' ],
};
