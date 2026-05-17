/**
 * WordPress dependencies
 */
import type { BlockConfiguration } from '@wordpress/blocks';
import * as heading from '@wordpress/block-library/build-module/heading/index.mjs';

/**
 * Internal dependencies
 */
import Edit from './edit';

export const { name, metadata } = heading;

export const settings: Partial< BlockConfiguration > = {
	...heading.settings,
	attributes: {
		...heading.metadata.attributes,
		markdownData: {
			type: 'object',
			default: {
				format: 'atx',
			},
		},
	},
	edit: Edit as BlockConfiguration[ 'edit' ],
};
