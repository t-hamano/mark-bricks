/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'heading-and-code',
	title: () => _x( 'Heading and code', 'slide pattern', 'mark-bricks' ),
	categories: [ 'code' ],
	markdown: `## {{heading}}

\`\`\`js
function example( value ) {
  return value * 2;
}
\`\`\``,
	strings: () => ( {
		heading: _x( 'Slides as plain text', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
