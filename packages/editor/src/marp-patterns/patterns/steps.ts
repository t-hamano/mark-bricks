/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'steps',
	title: () => _x( 'Steps', 'slide pattern', 'mark-bricks' ),
	categories: [ 'text' ],
	markdown: `## {{heading}}

1. **{{step1}}**: {{step1Text}}
2. **{{step2}}**: {{step2Text}}
3. **{{step3}}**: {{step3Text}}`,
	strings: () => ( {
		heading: _x( 'How it works', 'slide pattern', 'mark-bricks' ),
		step1: _x( 'Plan', 'slide pattern', 'mark-bricks' ),
		step1Text: _x( 'Decide what to do', 'slide pattern', 'mark-bricks' ),
		step2: _x( 'Build', 'slide pattern', 'mark-bricks' ),
		step2Text: _x( 'Make it happen', 'slide pattern', 'mark-bricks' ),
		step3: _x( 'Review', 'slide pattern', 'mark-bricks' ),
		step3Text: _x( 'Check the results', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
