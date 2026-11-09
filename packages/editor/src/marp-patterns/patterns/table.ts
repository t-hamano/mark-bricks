/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'table',
	title: () => _x( 'Comparison table', 'slide pattern', 'mark-bricks' ),
	categories: [ 'data' ],
	markdown: `## {{heading}}

| {{header1}} | {{header2}} | {{header3}} |
| - | - | - |
| {{row1Label}} | {{row1Value1}} | {{row1Value2}} |
| {{row2Label}} | {{row2Value1}} | {{row2Value2}} |
| {{row3Label}} | {{row3Value1}} | {{row3Value2}} |`,
	strings: () => ( {
		heading: _x( 'Comparison', 'slide pattern', 'mark-bricks' ),
		header1: _x( 'Item', 'slide pattern', 'mark-bricks' ),
		header2: _x( 'Option A', 'slide pattern', 'mark-bricks' ),
		header3: _x( 'Option B', 'slide pattern', 'mark-bricks' ),
		row1Label: _x( 'Cost', 'slide pattern', 'mark-bricks' ),
		row1Value1: _x( 'Low', 'slide pattern', 'mark-bricks' ),
		row1Value2: _x( 'High', 'slide pattern', 'mark-bricks' ),
		row2Label: _x( 'Speed', 'slide pattern', 'mark-bricks' ),
		row2Value1: _x( 'Moderate', 'slide pattern', 'mark-bricks' ),
		row2Value2: _x( 'Fast', 'slide pattern', 'mark-bricks' ),
		row3Label: _x( 'Support', 'slide pattern', 'mark-bricks' ),
		row3Value1: _x( 'Community', 'slide pattern', 'mark-bricks' ),
		row3Value2: _x( 'Dedicated team', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
