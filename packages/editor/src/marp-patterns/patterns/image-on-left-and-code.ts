/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { PLACEHOLDER_IMAGE } from '../placeholder-image';
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'image-on-left-and-code',
	title: () =>
		_x( 'Image on the left and code', 'slide pattern', 'mark-bricks' ),
	categories: [ 'code', 'image' ],
	markdown: `![bg left:40%](${ PLACEHOLDER_IMAGE })

## {{heading}}

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
