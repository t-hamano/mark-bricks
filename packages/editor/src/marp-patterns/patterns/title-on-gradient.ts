/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'title-on-gradient',
	title: () => _x( 'Title on a gradient', 'slide pattern', 'mark-bricks' ),
	categories: [ 'title' ],
	markdown: `<!--
_class: lead invert
_backgroundImage: "linear-gradient(135deg, #1e3a8a, #0e7490)"
-->

# {{title}}

{{subtitle}}`,
	strings: () => ( {
		title: _x( 'Presentation title', 'slide pattern', 'mark-bricks' ),
		subtitle: _x( 'Your name · Date', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
