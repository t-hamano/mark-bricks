/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'heading-and-centered-text',
	title: () =>
		_x( 'Heading and centered text', 'slide pattern', 'mark-bricks' ),
	categories: [ 'text' ],
	markdown: `<style scoped>
section { display: grid; grid-template-rows: auto 1fr; }
p { align-self: center; font-size: 1.5em; text-align: center; }
</style>

## {{heading}}

{{text}}`,
	strings: () => ( {
		heading: _x( 'Slides as plain text', 'slide pattern', 'mark-bricks' ),
		text: _x(
			'Write your slides as plain text and let the theme take care of the design.',
			'slide pattern',
			'mark-bricks'
		),
	} ),
};

export default pattern;
