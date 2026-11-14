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
	name: 'heading-and-text-on-image',
	title: () =>
		_x( 'Heading and text on an image', 'slide pattern', 'mark-bricks' ),
	categories: [ 'text', 'image' ],
	markdown: `<!-- _class: invert -->

![bg brightness:0.4](${ PLACEHOLDER_IMAGE })

## {{heading}}

{{text}}`,
	strings: () => ( {
		heading: _x( 'Slides as plain text', 'slide pattern', 'mark-bricks' ),
		text: _x(
			'Write your slides as plain text and let the theme take care of the design.',
			'slide pattern',
			'mark-bricks'
		),
	} ),
};

export default pattern;
