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

{{text}}

- {{item1}}
- {{item2}}
- {{item3}}`,
	strings: () => ( {
		heading: _x( 'Slides as plain text', 'slide pattern', 'mark-bricks' ),
		text: _x(
			'Write your slides as plain text and let the theme take care of the design.',
			'slide pattern',
			'mark-bricks'
		),
		item1: _x( 'Write in plain text', 'slide pattern', 'mark-bricks' ),
		item2: _x( 'Preview as you type', 'slide pattern', 'mark-bricks' ),
		item3: _x(
			'Export when you are ready',
			'slide pattern',
			'mark-bricks'
		),
	} ),
};

export default pattern;
