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
	name: 'image-and-caption',
	title: () => _x( 'Image with a caption', 'slide pattern', 'mark-bricks' ),
	categories: [ 'image' ],
	markdown: `## {{heading}}

![h:360](${ PLACEHOLDER_IMAGE })

{{caption}}`,
	strings: () => ( {
		heading: _x( 'Slide title', 'slide pattern', 'mark-bricks' ),
		caption: _x(
			'A caption for the image',
			'slide pattern',
			'mark-bricks'
		),
	} ),
};

export default pattern;
