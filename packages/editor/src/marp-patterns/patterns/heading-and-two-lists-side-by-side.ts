/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'heading-and-two-lists-side-by-side',
	title: () =>
		_x(
			'Heading and two lists side by side',
			'slide pattern',
			'mark-bricks'
		),
	categories: [ 'text' ],
	markdown: `<style scoped>
section { display: grid; grid-template-columns: 1fr 1fr; align-content: center; column-gap: 2em; }
h2 { grid-column: 1 / -1; }
h3 { grid-row: 2; }
ul { grid-row: 3; }
</style>

## {{heading}}

### {{subheading1}}

- {{item1}}
- {{item2}}
- {{item3}}

### {{subheading2}}

- {{item4}}
- {{item5}}
- {{item6}}`,
	strings: () => ( {
		heading: _x( 'Slides as plain text', 'slide pattern', 'mark-bricks' ),
		subheading1: _x( 'Markdown', 'slide pattern', 'mark-bricks' ),
		item1: _x( 'Plain text', 'slide pattern', 'mark-bricks' ),
		item2: _x( 'From the theme', 'slide pattern', 'mark-bricks' ),
		item3: _x( 'Any editor', 'slide pattern', 'mark-bricks' ),
		subheading2: _x( 'Slide app', 'slide pattern', 'mark-bricks' ),
		item4: _x( 'Binary file', 'slide pattern', 'mark-bricks' ),
		item5: _x( 'By hand', 'slide pattern', 'mark-bricks' ),
		item6: _x( 'One app', 'slide pattern', 'mark-bricks' ),
	} ),
};

export default pattern;
