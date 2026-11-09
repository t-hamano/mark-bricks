/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'resources',
	title: () => _x( 'Resources', 'slide pattern', 'mark-bricks' ),
	categories: [ 'closing' ],
	markdown: `## {{heading}}

- [{{link1}}](https://example.com)
- [{{link2}}](https://example.com)
- [{{link3}}](https://example.com)`,
	strings: () => ( {
		heading: _x( 'Resources', 'slide pattern', 'mark-bricks' ),
		link1: _x( 'Documentation', 'slide pattern', 'mark-bricks' ),
		link2: _x( 'Source code', 'slide pattern', 'mark-bricks' ),
		link3: _x( 'Related article', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
