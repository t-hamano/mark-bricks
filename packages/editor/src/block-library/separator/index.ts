/**
 * WordPress dependencies
 */
import type { BlockConfiguration } from '@wordpress/blocks';
import * as separator from '@wordpress/block-library/build-module/separator/index.mjs';

/**
 * Internal dependencies
 */
import Edit from './edit';
import transforms from './transforms';

export const { name, metadata } = separator;

export const settings: Partial< BlockConfiguration > = {
	...separator.settings,
	attributes: {
		...separator.metadata.attributes,
		markdownData: {
			type: 'object',
			default: {
				format: {
					marker: '-',
					repetition: 3,
					spaces: false,
				},
			},
		},
	},
	transforms,
	edit: Edit as BlockConfiguration[ 'edit' ],
};
