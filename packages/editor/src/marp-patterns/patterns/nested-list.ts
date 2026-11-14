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
	title: () => _x( 'List (Nested)', 'slide pattern', 'mark-bricks' ),
	categories: [ 'list' ],
	markdown: `## {{heading}}

- {{item1}}
  - {{nested1}}
  - {{nested2}}
- {{item2}}
  - {{nested3}}`,
	strings: () => ( {
		heading: _x( 'Slides as plain text', 'slide pattern', 'mark-bricks' ),
		item1: _x( 'Write in plain text', 'slide pattern', 'mark-bricks' ),
		nested1: _x(
			'Headings, lists and tables',
			'slide pattern',
			'mark-bricks'
		),
		nested2: _x( 'Code and images', 'slide pattern', 'mark-bricks' ),
		item2: _x( 'Preview as you type', 'slide pattern', 'mark-bricks' ),
		nested3: _x(
			'Switch themes at any time',
			'slide pattern',
			'mark-bricks'
		),
	} ),
};

export default pattern;
