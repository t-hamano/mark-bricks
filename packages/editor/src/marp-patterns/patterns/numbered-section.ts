/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'numbered-section',
	title: () =>
		_x( 'Numbered section divider', 'slide pattern', 'mark-bricks' ),
	categories: [ 'section' ],
	markdown: `<!-- _class: lead -->

## {{number}}

# {{heading}}`,
	strings: () => ( {
		number: _x( 'Part 1', 'slide pattern', 'mark-bricks' ),
		heading: _x( 'Section title', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
