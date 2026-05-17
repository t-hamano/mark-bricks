/**
 * WordPress dependencies
 */
import type { BlockConfiguration } from '@wordpress/blocks';
import * as code from '@wordpress/block-library/build-module/code/index.mjs';

/**
 * Internal dependencies
 */
import Edit from './edit';

export const { name, metadata } = code;

export const settings: Partial< BlockConfiguration > = {
	...code.settings,
	attributes: {
		...code.metadata.attributes,
		markdownData: {
			type: 'object',
			default: {
				format: 'fenced-backtick',
			},
		},
	},
	edit: Edit as BlockConfiguration[ 'edit' ],
};
