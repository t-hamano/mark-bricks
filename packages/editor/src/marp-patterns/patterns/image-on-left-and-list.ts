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
	name: 'image-on-left-and-list',
	title: () =>
		_x( 'Image on the left and list', 'slide pattern', 'mark-bricks' ),
	categories: [ 'image', 'list' ],
	markdown: `![bg left:40%](${ PLACEHOLDER_IMAGE })

## {{heading}}

- {{item1}}
- {{item2}}
- {{item3}}`,
	strings: () => ( {
		heading: _x( 'Heading', 'slide pattern', 'mark-bricks' ),
		item1: _x( 'First item', 'slide pattern', 'mark-bricks' ),
		item2: _x( 'Second item', 'slide pattern', 'mark-bricks' ),
		item3: _x( 'Third item', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
