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
	// A Markdown list item may hold any block its content can be converted
	// to, not only a nested list.
	allowedBlocks: [
		'core/list',
		'core/paragraph',
		'core/heading',
		'core/code',
		'core/math',
		'core/separator',
		'core/table',
		'core/image',
		'core/quote',
		'core/html',
		'core/details',
	],
	edit: Edit as BlockConfiguration[ 'edit' ],
};
