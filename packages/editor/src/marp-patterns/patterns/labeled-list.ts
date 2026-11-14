/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'labeled-list',
	title: () => _x( 'List (Labeled)', 'slide pattern', 'mark-bricks' ),
	categories: [ 'list' ],
	markdown: `## {{heading}}

- **{{label1}}**: {{description1}}
- **{{label2}}**: {{description2}}
- **{{label3}}**: {{description3}}`,
	strings: () => ( {
		heading: _x( 'Heading', 'slide pattern', 'mark-bricks' ),
		label1: _x( 'Label', 'slide pattern', 'mark-bricks' ),
		description1: _x( 'Description', 'slide pattern', 'mark-bricks' ),
		label2: _x( 'Label', 'slide pattern', 'mark-bricks' ),
		description2: _x( 'Description', 'slide pattern', 'mark-bricks' ),
		label3: _x( 'Label', 'slide pattern', 'mark-bricks' ),
		description3: _x( 'Description', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
