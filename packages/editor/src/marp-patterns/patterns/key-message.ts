/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'key-message',
	title: () => _x( 'Key message', 'slide pattern', 'mark-bricks' ),
	categories: [ 'text' ],
	markdown: `<!-- _class: lead -->

## {{message}}`,
	strings: () => ( {
		message: _x(
			'One message you want everyone to remember',
			'slide pattern',
			'mark-bricks'
		),
	} ),
};

export default pattern;
