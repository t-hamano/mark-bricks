/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'heading-code-and-list',
	title: () =>
		_x( 'Heading, code, and list', 'slide pattern', 'mark-bricks' ),
	categories: [ 'code', 'list' ],
	markdown: `## {{heading}}

\`\`\`js
function example( value ) {
  return value * 2;
}
\`\`\`

- {{item1}}
- {{item2}}
- {{item3}}`,
	strings: () => ( {
		heading: _x( 'Slides as plain text', 'slide pattern', 'mark-bricks' ),
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
