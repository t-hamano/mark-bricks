/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'key-figure',
	title: () => _x( 'Key figure', 'slide pattern', 'mark-bricks' ),
	categories: [ 'data' ],
	markdown: `<!-- _class: lead -->

# {{figure}}

{{description}}`,
	strings: () => ( {
		figure: _x( '85%', 'slide pattern', 'mark-bricks' ),
		description: _x(
			'What this number means',
			'slide pattern',
			'mark-bricks'
		),
	} ),
};

export default pattern;
