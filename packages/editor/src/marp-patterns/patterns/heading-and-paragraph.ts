/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'heading-and-paragraph',
	title: () => _x( 'Heading and paragraph', 'slide pattern', 'mark-bricks' ),
	categories: [ 'text' ],
	markdown: `## {{heading}}

{{body}}`,
	strings: () => ( {
		heading: _x( 'Slide title', 'slide pattern', 'mark-bricks' ),
		body: _x(
			'Write a few sentences here to explain the idea of this slide in more detail.',
			'slide pattern',
			'mark-bricks'
		),
	} ),
};

export default pattern;
