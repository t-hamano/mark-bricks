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
	categories: [ 'text', 'image' ],
	markdown: `<!-- _class: lead invert -->

![bg brightness:0.3](${ PLACEHOLDER_IMAGE })

> {{quote}}

{{citation}}`,
	strings: () => ( {
		quote: _x( 'Quote text', 'slide pattern', 'mark-bricks' ),
		citation: _x( 'Citation', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
