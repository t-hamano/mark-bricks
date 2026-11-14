/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'heading-and-three-steps-in-a-row',
	title: () =>
		_x(
			'Heading and three steps in a row',
			'slide pattern',
			'mark-bricks'
		),
	categories: [ 'text' ],
	markdown: `<style scoped>
ol { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2em; padding: 0; list-style: none; text-align: center; }
li { position: relative; margin: 0; }
li + li::before { content: "→"; position: absolute; left: -1.5em; width: 1em; }
strong { display: block; }
</style>

## {{heading}}

1. **{{label1}}** {{text1}}
2. **{{label2}}** {{text2}}
3. **{{label3}}** {{text3}}`,
	strings: () => ( {
		heading: _x( 'Slides as plain text', 'slide pattern', 'mark-bricks' ),
		label1: _x( 'Write', 'slide pattern', 'mark-bricks' ),
		text1: _x( 'Use any text editor', 'slide pattern', 'mark-bricks' ),
		label2: _x( 'Preview', 'slide pattern', 'mark-bricks' ),
		text2: _x(
			'See each slide as you type',
			'slide pattern',
			'mark-bricks'
		),
		label3: _x( 'Share', 'slide pattern', 'mark-bricks' ),
		text3: _x( 'Export to HTML or PDF', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
