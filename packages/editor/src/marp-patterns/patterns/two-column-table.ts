/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'two-column-table',
	title: () => _x( 'Table (Two columns)', 'slide pattern', 'mark-bricks' ),
	categories: [ 'table' ],
	markdown: `## {{heading}}

| {{header1}} | {{header2}} |
| - | - |
| {{cell11}} | {{cell12}} |
| {{cell21}} | {{cell22}} |
| {{cell31}} | {{cell32}} |`,
	strings: () => ( {
		heading: _x( 'Slides as plain text', 'slide pattern', 'mark-bricks' ),
		header1: _x( 'Feature', 'slide pattern', 'mark-bricks' ),
		header2: _x( 'Markdown', 'slide pattern', 'mark-bricks' ),
		cell11: _x( 'File format', 'slide pattern', 'mark-bricks' ),
		cell12: _x( 'Plain text', 'slide pattern', 'mark-bricks' ),
		cell21: _x( 'Design', 'slide pattern', 'mark-bricks' ),
		cell22: _x( 'From the theme', 'slide pattern', 'mark-bricks' ),
		cell31: _x( 'Editing', 'slide pattern', 'mark-bricks' ),
		cell32: _x( 'Any editor', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
