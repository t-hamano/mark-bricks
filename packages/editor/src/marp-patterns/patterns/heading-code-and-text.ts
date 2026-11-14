/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'heading-code-and-text',
	title: () =>
		_x( 'Heading, code, and text', 'slide pattern', 'mark-bricks' ),
	categories: [ 'code' ],
	markdown: `## {{heading}}

\`\`\`js
function example( value ) {
  return value * 2;
}
\`\`\`

{{text}}`,
	strings: () => ( {
		heading: _x( 'Heading', 'slide pattern', 'mark-bricks' ),
		text: _x(
			'Write a short paragraph here.',
			'slide pattern',
			'mark-bricks'
		),
	} ),
};

export default pattern;
