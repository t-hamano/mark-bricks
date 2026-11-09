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
	name: 'title-and-background-image',
	title: () => _x( 'Title on an image', 'slide pattern', 'mark-bricks' ),
	categories: [ 'title', 'image' ],
	markdown: `<!-- _class: lead invert -->

![bg brightness:0.5](${ PLACEHOLDER_IMAGE })

# {{title}}

{{subtitle}}`,
	strings: () => ( {
		title: _x( 'Presentation title', 'slide pattern', 'mark-bricks' ),
		subtitle: _x( 'Your name · Date', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
