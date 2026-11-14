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
		heading: _x( 'Heading', 'slide pattern', 'mark-bricks' ),
		item1: _x( 'First item', 'slide pattern', 'mark-bricks' ),
		item2: _x( 'Second item', 'slide pattern', 'mark-bricks' ),
		item3: _x( 'Third item', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
