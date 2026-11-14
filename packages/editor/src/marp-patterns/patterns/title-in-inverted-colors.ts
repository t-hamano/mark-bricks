/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'title-in-inverted-colors',
	title: () =>
		_x( 'Title in inverted colors', 'slide pattern', 'mark-bricks' ),
	categories: [ 'title' ],
	markdown: `<!-- _class: lead invert -->

# {{title}}

{{subtitle}}`,
	strings: () => ( {
		title: _x( 'Title', 'slide pattern', 'mark-bricks' ),
		subtitle: _x( 'Subtitle', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
