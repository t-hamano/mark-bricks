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
		heading: _x( 'Heading', 'slide pattern', 'mark-bricks' ),
		subheading: _x( 'Subheading', 'slide pattern', 'mark-bricks' ),
		text: _x(
			'Write a short paragraph here.',
			'slide pattern',
			'mark-bricks'
		),
	} ),
};

export default pattern;
