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
	name: 'image-on-right-and-text',
	title: () =>
		_x( 'Image on the right and text', 'slide pattern', 'mark-bricks' ),
	categories: [ 'image' ],
	markdown: `![bg right:40%](${ PLACEHOLDER_IMAGE })

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
