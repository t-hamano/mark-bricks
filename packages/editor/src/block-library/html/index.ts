/**
 * WordPress dependencies
 */
import type { BlockConfiguration } from '@wordpress/blocks';
import * as html from '@wordpress/block-library/build-module/html/index.mjs';

/**
 * Internal dependencies
 */
import Edit from './edit';

export const { name, metadata } = html;

export const settings: Partial< BlockConfiguration > = {
	...html.settings,
	edit: Edit as BlockConfiguration[ 'edit' ],
};
