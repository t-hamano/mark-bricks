/**
 * WordPress dependencies
 */
import type { BlockConfiguration } from '@wordpress/blocks';
import * as math from '@wordpress/block-library/build-module/math/index.mjs';

/**
 * Internal dependencies
 */
import Edit from './edit';
import transforms from './transforms';

export const { name, metadata } = math;

export const settings: Partial< BlockConfiguration > = {
	...math.settings,
	attributes: {
		...math.metadata.attributes,
		markdownData: {
			type: 'object',
			default: {
				format: 'dollar',
			},
		},
	},
	transforms,
	edit: Edit as BlockConfiguration[ 'edit' ],
};
