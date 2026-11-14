/// <reference path="../wp-block-library.d.ts" />

/**
 * WordPress dependencies
 */
import type { BlockConfiguration } from '@wordpress/blocks';
import * as quote from '@wordpress/block-library/build-module/quote/index.mjs';

/**
 * Internal dependencies
 */
import Edit from './edit';

export const { name, metadata } = quote;

export const settings: Partial< BlockConfiguration > = {
	...quote.settings,
	attributes: {
		...quote.metadata.attributes,
		markdownData: {
			type: 'object',
		},
	},
	template: [ [ 'core/paragraph' ] ],
	edit: Edit,
};
