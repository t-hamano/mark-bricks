/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'heading-and-quote',
	title: () => _x( 'Heading and quote', 'slide pattern', 'mark-bricks' ),
	categories: [ 'text' ],
	markdown: `## {{heading}}

> {{quote}}

{{citation}}`,
	strings: () => ( {
		heading: _x( 'Heading', 'slide pattern', 'mark-bricks' ),
		quote: _x( 'Quote text', 'slide pattern', 'mark-bricks' ),
		citation: _x( 'Citation', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
