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
	name: 'heading-image-and-caption',
	title: () =>
		_x( 'Heading, image, and caption', 'slide pattern', 'mark-bricks' ),
	categories: [ 'image' ],
	markdown: `## {{heading}}

![h:360](${ PLACEHOLDER_IMAGE })

{{caption}}`,
	strings: () => ( {
		heading: _x( 'Slides as plain text', 'slide pattern', 'mark-bricks' ),
		caption: _x(
			'A slide written in Markdown',
			'slide pattern',
			'mark-bricks'
		),
	} ),
};

export default pattern;
