/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'title',
	title: () => _x( 'Title', 'slide pattern', 'mark-bricks' ),
	keywords: () => [
		_x( 'cover', 'slide pattern keyword', 'mark-bricks' ),
		_x( 'opening', 'slide pattern keyword', 'mark-bricks' ),
	],
	markdown: `<!-- _class: lead -->

# {{title}}

{{subtitle}}`,
	strings: () => ( {
		title: _x( 'Presentation title', 'slide pattern', 'mark-bricks' ),
		subtitle: _x( 'Your name · Date', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
