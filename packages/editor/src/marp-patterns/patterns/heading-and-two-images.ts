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
	name: 'heading-and-two-images',
	title: () => _x( 'Heading and two images', 'slide pattern', 'mark-bricks' ),
	categories: [ 'image' ],
	markdown: `## {{heading}}

![h:280](${ PLACEHOLDER_IMAGE }) ![h:280](${ PLACEHOLDER_IMAGE })`,
	strings: () => ( {
		heading: _x( 'Heading', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
