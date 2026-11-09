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
	name: 'section-and-image',
	title: () =>
		_x( 'Section divider with an image', 'slide pattern', 'mark-bricks' ),
	categories: [ 'section', 'image' ],
	markdown: `<!-- _class: invert -->

![bg left:40%](${ PLACEHOLDER_IMAGE })

## {{number}}

# {{heading}}`,
	strings: () => ( {
		number: _x( 'Part 1', 'slide pattern', 'mark-bricks' ),
		heading: _x( 'Section title', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
