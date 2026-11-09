/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'questions',
	title: () => _x( 'Questions', 'slide pattern', 'mark-bricks' ),
	categories: [ 'closing' ],
	markdown: `<!-- _class: lead invert -->

# {{heading}}

{{note}}`,
	strings: () => ( {
		heading: _x( 'Questions?', 'slide pattern', 'mark-bricks' ),
		note: _x( 'Feel free to ask anything', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
