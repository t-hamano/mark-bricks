/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'heading-subheading-and-text',
	title: () =>
		_x( 'Heading, subheading, and text', 'slide pattern', 'mark-bricks' ),
	categories: [ 'text' ],
	markdown: `## {{heading}}

### {{subheading}}

{{text}}`,
	strings: () => ( {
		heading: _x( 'Slides as plain text', 'slide pattern', 'mark-bricks' ),
		subheading: _x(
			'Focus on your message',
			'slide pattern',
			'mark-bricks'
		),
		text: _x(
			'Write your slides as plain text and let the theme take care of the design.',
			'slide pattern',
			'mark-bricks'
		),
	} ),
};

export default pattern;
