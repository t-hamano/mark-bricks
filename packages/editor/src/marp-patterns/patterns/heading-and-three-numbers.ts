/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'heading-and-three-numbers',
	title: () =>
		_x( 'Heading and three numbers', 'slide pattern', 'mark-bricks' ),
	categories: [ 'text' ],
	markdown: `<style scoped>
ul { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1em; padding: 0; list-style: none; text-align: center; }
strong { display: block; font-size: 2.5em; }
</style>

## {{heading}}

- **{{number1}}** {{label1}}
- **{{number2}}** {{label2}}
- **{{number3}}** {{label3}}`,
	strings: () => ( {
		heading: _x( 'Slides as plain text', 'slide pattern', 'mark-bricks' ),
		number1: _x( '1', 'slide pattern', 'mark-bricks' ),
		label1: _x( 'File for each deck', 'slide pattern', 'mark-bricks' ),
		number2: _x( '3', 'slide pattern', 'mark-bricks' ),
		label2: _x( 'Built-in themes', 'slide pattern', 'mark-bricks' ),
		number3: _x( '100%', 'slide pattern', 'mark-bricks' ),
		label3: _x( 'Plain text', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
