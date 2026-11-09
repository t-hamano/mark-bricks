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
	name: 'stacked-images-and-text',
	title: () =>
		_x( 'Two stacked images and text', 'slide pattern', 'mark-bricks' ),
	categories: [ 'image' ],
	markdown: `![bg right vertical](${ PLACEHOLDER_IMAGE })
![bg](${ PLACEHOLDER_IMAGE })

## {{heading}}

{{body}}`,
	strings: () => ( {
		heading: _x( 'Slide title', 'slide pattern', 'mark-bricks' ),
		body: _x(
			'Write a few sentences here to explain the idea of this slide in more detail.',
			'slide pattern',
			'mark-bricks'
		),
	} ),
};

export default pattern;
