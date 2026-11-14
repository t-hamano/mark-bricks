/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'title-only',
	title: () => _x( 'Title only', 'slide pattern', 'mark-bricks' ),
	categories: [ 'title' ],
	markdown: `<!-- _class: lead -->

# {{title}}`,
	strings: () => ( {
		title: _x( 'Title', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
