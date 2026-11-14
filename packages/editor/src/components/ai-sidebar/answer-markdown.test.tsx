// @vitest-environment jsdom

/**
 * External dependencies
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Internal dependencies
 */
import { PlatformProvider } from '../../platform';
import { AnswerMarkdown } from './answer-markdown';

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
 ).IS_REACT_ACT_ENVIRONMENT = true;

describe( 'AnswerMarkdown', () => {
	let container: HTMLDivElement;
	let root: Root;

	beforeEach( () => {
		container = document.createElement( 'div' );
		document.body.appendChild( container );
		root = createRoot( container );
	} );

	afterEach( () => {
		act( () => root.unmount() );
		container.remove();
	} );

	function render( markdown: string, openUrl?: ( url: string ) => void ) {
		act( () =>
			root.render(
				<PlatformProvider platform={ { openUrl } }>
					<AnswerMarkdown>{ markdown }</AnswerMarkdown>
				</PlatformProvider>
			)
		);
	}

	it( 'formats bold text, lists, and code', () => {
		render(
			'- **Cover**: uses `lead`\n- Body\n\n| a | b |\n| - | - |\n| 1 | 2 |'
		);

		expect( container.querySelectorAll( 'li' ) ).toHaveLength( 2 );
		expect( container.querySelector( 'li strong' )?.textContent ).toBe(
			'Cover'
		);
		expect( container.querySelector( 'li code' )?.textContent ).toBe(
			'lead'
		);
		expect( container.querySelector( 'table td' )?.textContent ).toBe(
			'1'
		);
	} );

	it( 'shows unclosed formatting as written while the answer streams in', () => {
		render( 'Some **bold' );

		expect( container.querySelector( 'strong' ) ).toBeNull();
		expect( container.textContent ).toBe( 'Some **bold' );
	} );

	it( 'does not render HTML written in the answer', () => {
		render(
			'Hi <img src="x" onerror="alert(1)"><script>alert(1)</script>'
		);

		expect( container.querySelector( 'img' ) ).toBeNull();
		expect( container.querySelector( 'script' ) ).toBeNull();
	} );

	it( 'shows the alt text of images instead of loading them', () => {
		render( '![A chart](https://example.com/chart.png)' );

		expect( container.querySelector( 'img' ) ).toBeNull();
		expect( container.textContent ).toBe( 'A chart' );
	} );

	it( 'drops unsafe link URLs', () => {
		render( '[click](javascript:alert(1))' );

		expect(
			container.querySelector( 'a' )?.getAttribute( 'href' ) ?? ''
		).not.toContain( 'javascript' );
	} );

	it( 'opens links through the host', () => {
		const openUrl = vi.fn();
		render( '[Marp](https://marp.app/)', openUrl );

		const link = container.querySelector( 'a' );
		expect( link?.getAttribute( 'href' ) ).toBe( 'https://marp.app/' );
		act( () => link?.click() );
		expect( openUrl ).toHaveBeenCalledWith( 'https://marp.app/' );
	} );
} );
