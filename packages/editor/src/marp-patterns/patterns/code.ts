/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'code',
	title: () => _x( 'Code', 'slide pattern', 'mark-bricks' ),
	categories: [ 'data' ],
	markdown: `## {{heading}}

\`\`\`js
function greet( name ) {
  return 'Hello, ' + name;
}
\`\`\`

{{caption}}`,
	strings: () => ( {
		heading: _x( 'Code example', 'slide pattern', 'mark-bricks' ),
		caption: _x( 'What this code does', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
