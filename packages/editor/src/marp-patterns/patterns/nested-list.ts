/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'nested-list',
	title: () => _x( 'Points with details', 'slide pattern', 'mark-bricks' ),
	categories: [ 'text' ],
	markdown: `## {{heading}}

- {{point1}}
  - {{detail1}}
- {{point2}}
  - {{detail2}}`,
	strings: () => ( {
		heading: _x( 'Slide title', 'slide pattern', 'mark-bricks' ),
		point1: _x( 'First point', 'slide pattern', 'mark-bricks' ),
		detail1: _x(
			'A detail about the first point',
			'slide pattern',
			'mark-bricks'
		),
		point2: _x( 'Second point', 'slide pattern', 'mark-bricks' ),
		detail2: _x(
			'A detail about the second point',
			'slide pattern',
			'mark-bricks'
		),
	} ),
};

export default pattern;
