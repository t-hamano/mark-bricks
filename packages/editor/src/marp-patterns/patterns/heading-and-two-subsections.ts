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
		heading: _x( 'Slides as plain text', 'slide pattern', 'mark-bricks' ),
		subheading1: _x(
			'Focus on your message',
			'slide pattern',
			'mark-bricks'
		),
		text1: _x(
			'Write your slides as plain text and let the theme take care of the design.',
			'slide pattern',
			'mark-bricks'
		),
		subheading2: _x( 'Keep every version', 'slide pattern', 'mark-bricks' ),
		text2: _x(
			'Plain text is easy to compare, review and keep in version control.',
			'slide pattern',
			'mark-bricks'
		),
	} ),
};

export default pattern;
