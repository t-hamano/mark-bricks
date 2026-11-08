/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import { renderSlides } from '.';

function lines( markdown: string ) {
	const { html } = renderSlides( markdown );
	return Array.from(
		html.matchAll( /<([\w-]+)[^>]*\sdata-line="(\d+)"/g ),
		( [ , tag, line ] ) => `${ tag }:${ line }`
	);
}

describe( 'source lines', () => {
	it( 'marks the slides and their block elements with their lines', () => {
		expect(
			lines(
				'---\nmarp: true\n---\n\n# A\n\n- x\n- y\n\n> q\n\n---\n\n| a |\n|---|\n| 1 |\n'
			)
		).toEqual( [
			'section:0',
			'h1:4',
			'ul:6',
			'li:6',
			'li:7',
			'blockquote:9',
			'p:9',
			'section:11',
			'table:13',
			'thead:13',
			'tr:13',
			'tbody:15',
			'tr:15',
		] );
	} );

	it( 'marks the blocks that render their own HTML', () => {
		expect(
			lines(
				'---\nmarp: true\nmath: katex\nhtml: true\n---\n\n```js\nx\n```\n\n    y\n\n$$\nz\n$$\n\n<div>\nw\n</div>\n'
			)
		).toEqual( [ 'section:0', 'pre:6', 'pre:10', 'p:12', 'div:16' ] );
	} );
} );
