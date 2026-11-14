/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'title-with-label',
	title: () => _x( 'Title with a label', 'slide pattern', 'mark-bricks' ),
	categories: [ 'title' ],
	markdown: `<!-- _class: lead -->

## {{label}}

# {{title}}`,
	strings: () => ( {
		label: _x( 'Label', 'slide pattern', 'mark-bricks' ),
		title: _x( 'Title', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
