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
	name: 'quote-on-image',
	title: () => _x( 'Quote on an image', 'slide pattern', 'mark-bricks' ),
	categories: [ 'image', 'text' ],
	markdown: `<!-- _class: lead invert -->

![bg sepia brightness:0.3](${ PLACEHOLDER_IMAGE })

> {{quote}}

{{author}}`,
	strings: () => ( {
		quote: _x(
			'A quote that supports your point.',
			'slide pattern',
			'mark-bricks'
		),
		author: _x( 'Name, Role', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
