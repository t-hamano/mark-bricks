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
	name: 'full-screen-image',
	title: () => _x( 'Full-screen image', 'slide pattern', 'mark-bricks' ),
	categories: [ 'image' ],
	markdown: `![bg](${ PLACEHOLDER_IMAGE })`,
	strings: () => ( {} ),
};

export default pattern;
