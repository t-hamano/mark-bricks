/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'closing',
	title: () => _x( 'Closing', 'slide pattern', 'mark-bricks' ),
	keywords: () => [
		_x( 'thanks', 'slide pattern keyword', 'mark-bricks' ),
		_x( 'questions', 'slide pattern keyword', 'mark-bricks' ),
		_x( 'end', 'slide pattern keyword', 'mark-bricks' ),
	],
	markdown: `<!-- _class: lead -->

# {{heading}}

{{contact}}`,
	strings: () => ( {
		heading: _x( 'Thank you', 'slide pattern', 'mark-bricks' ),
		contact: _x(
			'Questions and contact details',
			'slide pattern',
			'mark-bricks'
		),
	} ),
};

export default pattern;
