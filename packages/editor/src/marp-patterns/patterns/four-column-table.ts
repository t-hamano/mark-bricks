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
		heading: _x( 'Heading', 'slide pattern', 'mark-bricks' ),
		header1: _x( 'Header', 'slide pattern', 'mark-bricks' ),
		header2: _x( 'Header', 'slide pattern', 'mark-bricks' ),
		header3: _x( 'Header', 'slide pattern', 'mark-bricks' ),
		header4: _x( 'Header', 'slide pattern', 'mark-bricks' ),
		cell11: _x( 'Cell', 'slide pattern', 'mark-bricks' ),
		cell12: _x( 'Cell', 'slide pattern', 'mark-bricks' ),
		cell13: _x( 'Cell', 'slide pattern', 'mark-bricks' ),
		cell14: _x( 'Cell', 'slide pattern', 'mark-bricks' ),
		cell21: _x( 'Cell', 'slide pattern', 'mark-bricks' ),
		cell22: _x( 'Cell', 'slide pattern', 'mark-bricks' ),
		cell23: _x( 'Cell', 'slide pattern', 'mark-bricks' ),
		cell24: _x( 'Cell', 'slide pattern', 'mark-bricks' ),
		cell31: _x( 'Cell', 'slide pattern', 'mark-bricks' ),
		cell32: _x( 'Cell', 'slide pattern', 'mark-bricks' ),
		cell33: _x( 'Cell', 'slide pattern', 'mark-bricks' ),
		cell34: _x( 'Cell', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
