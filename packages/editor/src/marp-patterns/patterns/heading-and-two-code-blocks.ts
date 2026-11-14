/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'heading-and-two-code-blocks',
	title: () =>
		_x( 'Heading and two code blocks', 'slide pattern', 'mark-bricks' ),
	categories: [ 'code' ],
	markdown: `## {{heading}}

\`\`\`js
function example( value ) {
  return value * 2;
}
\`\`\`

\`\`\`js
const result = example( 2 );
console.log( result );
\`\`\``,
	strings: () => ( {
		heading: _x( 'Heading', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
