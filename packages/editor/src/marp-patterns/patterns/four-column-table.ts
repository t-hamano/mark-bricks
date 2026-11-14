/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'four-column-table',
	title: () => _x( 'Table (Four columns)', 'slide pattern', 'mark-bricks' ),
	categories: [ 'table' ],
	markdown: `## {{heading}}

| {{header1}} | {{header2}} | {{header3}} | {{header4}} |
| - | - | - | - |
| {{cell11}} | {{cell12}} | {{cell13}} | {{cell14}} |
| {{cell21}} | {{cell22}} | {{cell23}} | {{cell24}} |
| {{cell31}} | {{cell32}} | {{cell33}} | {{cell34}} |`,
	strings: () => ( {
		heading: _x( 'Slides as plain text', 'slide pattern', 'mark-bricks' ),
		header1: _x( 'Feature', 'slide pattern', 'mark-bricks' ),
		header2: _x( 'Markdown', 'slide pattern', 'mark-bricks' ),
		header3: _x( 'Slide app', 'slide pattern', 'mark-bricks' ),
		header4: _x( 'Notes', 'slide pattern', 'mark-bricks' ),
		cell11: _x( 'File format', 'slide pattern', 'mark-bricks' ),
		cell12: _x( 'Plain text', 'slide pattern', 'mark-bricks' ),
		cell13: _x( 'Binary file', 'slide pattern', 'mark-bricks' ),
		cell14: _x( 'Easy to compare', 'slide pattern', 'mark-bricks' ),
		cell21: _x( 'Design', 'slide pattern', 'mark-bricks' ),
		cell22: _x( 'From the theme', 'slide pattern', 'mark-bricks' ),
		cell23: _x( 'By hand', 'slide pattern', 'mark-bricks' ),
		cell24: _x( 'Consistent look', 'slide pattern', 'mark-bricks' ),
		cell31: _x( 'Editing', 'slide pattern', 'mark-bricks' ),
		cell32: _x( 'Any editor', 'slide pattern', 'mark-bricks' ),
		cell33: _x( 'One app', 'slide pattern', 'mark-bricks' ),
		cell34: _x( 'Works offline', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
