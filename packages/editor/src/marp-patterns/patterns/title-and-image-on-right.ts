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
	name: 'title-and-image-on-right',
	title: () =>
		_x( 'Title and an image on the right', 'slide pattern', 'mark-bricks' ),
	categories: [ 'title', 'image' ],
	markdown: `<!-- _class: lead -->

![bg right:40%](${ PLACEHOLDER_IMAGE })

# {{title}}

{{subtitle}}`,
	strings: () => ( {
		title: _x(
			'Writing slides in Markdown',
			'slide pattern',
			'mark-bricks'
		),
		subtitle: _x( 'A short introduction', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
