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
	name: 'two-images-side-by-side',
	title: () =>
		_x( 'Two images side by side', 'slide pattern', 'mark-bricks' ),
	categories: [ 'image' ],
	markdown: `![bg](${ PLACEHOLDER_IMAGE })
![bg](${ PLACEHOLDER_IMAGE })`,
	strings: () => ( {} ),
};

export default pattern;
