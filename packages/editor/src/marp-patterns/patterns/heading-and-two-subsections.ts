/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'heading-and-two-subsections',
	title: () =>
		_x( 'Heading and two subsections', 'slide pattern', 'mark-bricks' ),
	categories: [ 'text' ],
	markdown: `## {{heading}}

### {{subheading1}}

{{text1}}

### {{subheading2}}

{{text2}}`,
	strings: () => ( {
		heading: _x( 'Heading', 'slide pattern', 'mark-bricks' ),
		subheading1: _x( 'Subheading', 'slide pattern', 'mark-bricks' ),
		text1: _x(
			'Write a short paragraph here.',
			'slide pattern',
			'mark-bricks'
		),
		subheading2: _x( 'Subheading', 'slide pattern', 'mark-bricks' ),
		text2: _x(
			'Write a short paragraph here.',
			'slide pattern',
			'mark-bricks'
		),
	} ),
};

export default pattern;
