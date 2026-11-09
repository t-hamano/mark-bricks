/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'bullet-list',
	title: () => _x( 'Bullet points', 'slide pattern', 'mark-bricks' ),
	categories: [ 'text' ],
	markdown: `## {{heading}}

- {{point1}}
- {{point2}}
- {{point3}}`,
	strings: () => ( {
		heading: _x( 'Slide title', 'slide pattern', 'mark-bricks' ),
		point1: _x( 'First point', 'slide pattern', 'mark-bricks' ),
		point2: _x( 'Second point', 'slide pattern', 'mark-bricks' ),
		point3: _x( 'Third point', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
