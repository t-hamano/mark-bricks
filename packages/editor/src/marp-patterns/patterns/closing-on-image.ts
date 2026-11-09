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
	name: 'closing-on-image',
	title: () => _x( 'Closing on an image', 'slide pattern', 'mark-bricks' ),
	categories: [ 'closing', 'image' ],
	markdown: `<!-- _class: lead -->

![bg blur:12px](${ PLACEHOLDER_IMAGE })

# {{heading}}

{{contact}}`,
	strings: () => ( {
		heading: _x( 'Thank you', 'slide pattern', 'mark-bricks' ),
		contact: _x(
			'Questions and contact details',
			'slide pattern',
			'mark-bricks'
		),
	} ),
};

export default pattern;
