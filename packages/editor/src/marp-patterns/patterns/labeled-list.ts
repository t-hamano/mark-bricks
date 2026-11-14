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
		heading: _x( 'Slides as plain text', 'slide pattern', 'mark-bricks' ),
		label1: _x( 'Write', 'slide pattern', 'mark-bricks' ),
		description1: _x(
			'Use any text editor',
			'slide pattern',
			'mark-bricks'
		),
		label2: _x( 'Preview', 'slide pattern', 'mark-bricks' ),
		description2: _x(
			'See each slide as you type',
			'slide pattern',
			'mark-bricks'
		),
		label3: _x( 'Share', 'slide pattern', 'mark-bricks' ),
		description3: _x(
			'Export to HTML or PDF',
			'slide pattern',
			'mark-bricks'
		),
	} ),
};

export default pattern;
