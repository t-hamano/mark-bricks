/**
 * WordPress dependencies
 */
import type { BlockConfiguration } from '@wordpress/blocks';
import * as image from '@wordpress/block-library/build-module/image/index.mjs';

/**
 * Internal dependencies
 */
import Edit from './edit';

export const { name, metadata } = image;

export const settings: Partial< BlockConfiguration > = {
	...image.settings,
	attributes: {
		...image.metadata.attributes,
		markdownData: {
			type: 'object',
		},
	},
	edit: Edit,
};
