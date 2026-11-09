/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'timeline',
	title: () => _x( 'Timeline', 'slide pattern', 'mark-bricks' ),
	categories: [ 'data' ],
	markdown: `## {{heading}}

| {{phase1}} | {{phase2}} | {{phase3}} |
| - | - | - |
| {{event1}} | {{event2}} | {{event3}} |`,
	strings: () => ( {
		heading: _x( 'Timeline', 'slide pattern', 'mark-bricks' ),
		phase1: _x( 'Phase 1', 'slide pattern', 'mark-bricks' ),
		phase2: _x( 'Phase 2', 'slide pattern', 'mark-bricks' ),
		phase3: _x( 'Phase 3', 'slide pattern', 'mark-bricks' ),
		event1: _x( 'Research', 'slide pattern', 'mark-bricks' ),
		event2: _x( 'Development', 'slide pattern', 'mark-bricks' ),
		event3: _x( 'Launch', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
