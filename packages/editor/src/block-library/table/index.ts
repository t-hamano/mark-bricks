/**
 * WordPress dependencies
 */
import type { BlockConfiguration } from '@wordpress/blocks';
import * as table from '@wordpress/block-library/build-module/table/index.mjs';

/**
 * Internal dependencies
 */
import Edit from './edit';

export const { name, metadata } = table;

export const settings: Partial< BlockConfiguration > = {
	...table.settings,
	edit: Edit as BlockConfiguration[ 'edit' ],
};
