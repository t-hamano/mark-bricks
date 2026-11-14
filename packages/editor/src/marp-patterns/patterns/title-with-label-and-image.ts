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
	name: 'title-with-label-and-image',
	title: () =>
		_x( 'Title with a label and an image', 'slide pattern', 'mark-bricks' ),
	categories: [ 'title', 'image' ],
	markdown: `![bg left:40%](${ PLACEHOLDER_IMAGE })

## {{label}}

# {{title}}`,
	strings: () => ( {
		label: _x( 'Label', 'slide pattern', 'mark-bricks' ),
		title: _x( 'Title', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
