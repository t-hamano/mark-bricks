/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'ordered-list',
	title: () => _x( 'List (Ordered)', 'slide pattern', 'mark-bricks' ),
	categories: [ 'list' ],
	markdown: `## {{heading}}

1. {{item1}}
2. {{item2}}
3. {{item3}}`,
	strings: () => ( {
		heading: _x( 'Heading', 'slide pattern', 'mark-bricks' ),
		item1: _x( 'First item', 'slide pattern', 'mark-bricks' ),
		item2: _x( 'Second item', 'slide pattern', 'mark-bricks' ),
		item3: _x( 'Third item', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
