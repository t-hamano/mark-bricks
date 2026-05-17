/**
 * WordPress dependencies
 */
import type { BlockConfiguration } from '@wordpress/blocks';
import * as paragraph from '@wordpress/block-library/build-module/paragraph/index.mjs';

/**
 * Internal dependencies
 */
import Edit from './edit';

export const { name, metadata } = paragraph;

export const settings: Partial< BlockConfiguration > = {
	...paragraph.settings,
	edit: Edit as BlockConfiguration[ 'edit' ],
};
