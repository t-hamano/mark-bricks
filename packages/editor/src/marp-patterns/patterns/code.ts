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
	categories: [ 'code' ],
	markdown: `\`\`\`js
function example( value ) {
  return value * 2;
}
\`\`\``,
	strings: () => ( {} ),
};

export default pattern;
