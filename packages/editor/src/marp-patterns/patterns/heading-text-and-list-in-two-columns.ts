/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'heading-text-and-list-in-two-columns',
	title: () =>
		_x(
			'Heading, text and list in two columns',
			'slide pattern',
			'mark-bricks'
		),
	categories: [ 'text' ],
	markdown: `<style scoped>
section { display: grid; grid-template-columns: 1fr 1fr; align-content: center; align-items: start; column-gap: 2em; }
h2 { grid-column: 1 / -1; }
p, ul { margin-top: 0; }
</style>

## {{heading}}

{{text}}

- {{item1}}
- {{item2}}
- {{item3}}`,
	strings: () => ( {
		heading: _x( 'Slides as plain text', 'slide pattern', 'mark-bricks' ),
		text: _x(
			'Write your slides as plain text and let the theme take care of the design.',
			'slide pattern',
			'mark-bricks'
		),
		item1: _x( 'Write in plain text', 'slide pattern', 'mark-bricks' ),
		item2: _x( 'Preview as you type', 'slide pattern', 'mark-bricks' ),
		item3: _x(
			'Export when you are ready',
			'slide pattern',
			'mark-bricks'
		),
	} ),
};

export default pattern;
