/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'heading-and-three-cards',
	title: () =>
		_x( 'Heading and three cards', 'slide pattern', 'mark-bricks' ),
	categories: [ 'text' ],
	markdown: `<style scoped>
ul { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75em; padding: 0; list-style: none; }
li { margin: 0; padding: 0.75em 1em; border: 0.05em solid; border-radius: 0.3em; }
strong { display: block; }
</style>

## {{heading}}

- **{{label1}}** {{text1}}
- **{{label2}}** {{text2}}
- **{{label3}}** {{text3}}`,
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
