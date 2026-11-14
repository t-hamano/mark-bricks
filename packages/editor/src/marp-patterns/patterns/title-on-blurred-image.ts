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
	name: 'title-on-blurred-image',
	title: () =>
		_x( 'Title on a blurred image', 'slide pattern', 'mark-bricks' ),
	categories: [ 'title', 'image' ],
	markdown: `<!-- _class: lead -->

![bg blur:12px](${ PLACEHOLDER_IMAGE })

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
