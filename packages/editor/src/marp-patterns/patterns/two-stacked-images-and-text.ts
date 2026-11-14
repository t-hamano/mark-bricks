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
	name: 'two-stacked-images-and-text',
	title: () =>
		_x( 'Two stacked images and text', 'slide pattern', 'mark-bricks' ),
	categories: [ 'image' ],
	markdown: `![bg right vertical](${ PLACEHOLDER_IMAGE })
![bg](${ PLACEHOLDER_IMAGE })

## {{heading}}

{{text}}`,
	strings: () => ( {
		heading: _x( 'Heading', 'slide pattern', 'mark-bricks' ),
		text: _x(
			'Write a short paragraph here.',
			'slide pattern',
			'mark-bricks'
		),
	} ),
};

export default pattern;
