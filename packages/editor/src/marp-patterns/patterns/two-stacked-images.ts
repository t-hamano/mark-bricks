/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { PLACEHOLDER_IMAGE } from '../placeholder-image';
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'two-stacked-images',
	title: () => _x( 'Two stacked images', 'slide pattern', 'mark-bricks' ),
	categories: [ 'image' ],
	markdown: `![bg vertical](${ PLACEHOLDER_IMAGE })
![bg](${ PLACEHOLDER_IMAGE })`,
	strings: () => ( {} ),
};

export default pattern;
