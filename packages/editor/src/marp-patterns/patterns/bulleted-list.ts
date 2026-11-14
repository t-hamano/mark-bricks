/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'bulleted-list',
	title: () => _x( 'List (Bulleted)', 'slide pattern', 'mark-bricks' ),
	categories: [ 'list' ],
	markdown: `## {{heading}}

- {{item1}}
- {{item2}}
- {{item3}}`,
	strings: () => ( {
		heading: _x( 'Slides as plain text', 'slide pattern', 'mark-bricks' ),
		item1: _x( 'Write in plain text', 'slide pattern', 'mark-bricks' ),
		item2: _x( 'Preview as you type', 'slide pattern', 'mark-bricks' ),
		item3: _x(
			'Export when you are ready',
			'slide pattern',
			'mark-bricks'
		),
	} ),
};

export default pattern;
