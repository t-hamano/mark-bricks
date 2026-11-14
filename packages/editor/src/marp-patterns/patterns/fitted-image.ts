/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { PLACEHOLDER_IMAGE_PORTRAIT } from '../placeholder-image';
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'fitted-image',
	title: () =>
		_x( 'Image fitted to the slide', 'slide pattern', 'mark-bricks' ),
	categories: [ 'image' ],
	markdown: `![bg contain](${ PLACEHOLDER_IMAGE_PORTRAIT })`,
	strings: () => ( {} ),
};

export default pattern;
