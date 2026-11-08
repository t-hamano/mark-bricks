/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'agenda',
	title: () => _x( 'Agenda', 'slide pattern', 'mark-bricks' ),
	markdown: `## {{heading}}

1. {{item1}}
2. {{item2}}
3. {{item3}}`,
	strings: () => ( {
		heading: _x( 'Agenda', 'slide pattern', 'mark-bricks' ),
		item1: _x( 'Background', 'slide pattern', 'mark-bricks' ),
		item2: _x( 'Proposal', 'slide pattern', 'mark-bricks' ),
		item3: _x( 'Next steps', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
