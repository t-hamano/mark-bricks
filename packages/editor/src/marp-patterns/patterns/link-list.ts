/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'link-list',
	title: () => _x( 'List (Links)', 'slide pattern', 'mark-bricks' ),
	categories: [ 'list' ],
	markdown: `## {{heading}}

- [{{link1}}](https://example.com)
- [{{link2}}](https://example.com)
- [{{link3}}](https://example.com)`,
	strings: () => ( {
		heading: _x( 'Heading', 'slide pattern', 'mark-bricks' ),
		link1: _x( 'First link', 'slide pattern', 'mark-bricks' ),
		link2: _x( 'Second link', 'slide pattern', 'mark-bricks' ),
		link3: _x( 'Third link', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
