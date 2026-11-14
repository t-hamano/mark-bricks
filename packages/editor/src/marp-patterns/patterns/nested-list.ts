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
		heading: _x( 'Heading', 'slide pattern', 'mark-bricks' ),
		item1: _x( 'First item', 'slide pattern', 'mark-bricks' ),
		nested1: _x( 'Nested item', 'slide pattern', 'mark-bricks' ),
		nested2: _x( 'Nested item', 'slide pattern', 'mark-bricks' ),
		item2: _x( 'Second item', 'slide pattern', 'mark-bricks' ),
		nested3: _x( 'Nested item', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
