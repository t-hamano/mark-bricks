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

{{citation}}`,
	strings: () => ( {
		quote: _x(
			'Good slides say one thing, and say it clearly.',
			'slide pattern',
			'mark-bricks'
		),
		citation: _x( 'Alex Kim, Designer', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
