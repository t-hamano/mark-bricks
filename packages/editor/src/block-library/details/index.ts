/**
 * WordPress dependencies
 */
import type { BlockConfiguration } from '@wordpress/blocks';
import * as details from '@wordpress/block-library/build-module/details/index.mjs';

/**
 * Internal dependencies
 */
import Edit from './edit';

export const { name, metadata } = details;

export const settings: Partial< BlockConfiguration > = {
	...details.settings,
	// Unlike the inherited template, omit the placeholder attribute: the
	// paragraph edit component renders its own placeholder.
	template: [ [ 'core/paragraph' ] ],
	edit: Edit as BlockConfiguration[ 'edit' ],
};
