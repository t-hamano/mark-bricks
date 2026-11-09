/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'section',
	title: () => _x( 'Section divider', 'slide pattern', 'mark-bricks' ),
	categories: [ 'section' ],
	markdown: `<!-- _class: lead invert -->

# {{heading}}

{{description}}`,
	strings: () => ( {
		heading: _x( 'Section title', 'slide pattern', 'mark-bricks' ),
		description: _x(
			'A short line about this section',
			'slide pattern',
			'mark-bricks'
		),
	} ),
};

export default pattern;
