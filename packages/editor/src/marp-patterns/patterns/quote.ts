/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'quote',
	title: () => _x( 'Quote', 'slide pattern', 'mark-bricks' ),
	categories: [ 'text' ],
	markdown: `<!-- _class: lead -->

> {{quote}}

{{author}}`,
	strings: () => ( {
		quote: _x(
			'A quote that supports your point.',
			'slide pattern',
			'mark-bricks'
		),
		author: _x( 'Name, Role', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
