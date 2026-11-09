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
	name: 'image-on-left-and-text',
	title: () =>
		_x( 'Image on the left and text', 'slide pattern', 'mark-bricks' ),
	categories: [ 'image' ],
	markdown: `![bg left:40%](${ PLACEHOLDER_IMAGE })

## {{heading}}

- {{point1}}
- {{point2}}
- {{point3}}`,
	strings: () => ( {
		heading: _x( 'Slide title', 'slide pattern', 'mark-bricks' ),
		point1: _x( 'First point', 'slide pattern', 'mark-bricks' ),
		point2: _x( 'Second point', 'slide pattern', 'mark-bricks' ),
		point3: _x( 'Third point', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
