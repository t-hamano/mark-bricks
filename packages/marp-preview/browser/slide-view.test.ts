// @vitest-environment jsdom

/**
 * External dependencies
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Internal dependencies
 */
import { renderSlides } from '..';
import { createSlideView } from './slide-view';

// Used by Marp's auto-scaling elements, but missing from jsdom.
vi.stubGlobal(
	'ResizeObserver',
	class {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
);
// Keeps jsdom from logging that it has no canvas, which Marp's browser
// script probes for.
vi.spyOn( HTMLCanvasElement.prototype, 'getContext' ).mockReturnValue( null );

function nextFrame() {
	return new Promise( ( resolve ) => requestAnimationFrame( resolve ) );
}

describe( 'createSlideView', () => {
	beforeEach( () => {
		document.head.innerHTML = '';
		document.body.innerHTML = '';
	} );

	it( 'shows the slides on the next frame', async () => {
		const onRender = vi.fn();
		const view = createSlideView( document.body, onRender );
		view.render(
			renderSlides( '---\nmarp: true\n---\n\nA\n\n---\n\nB\n' )
		);
		expect( view.getSlides() ).toHaveLength( 0 );

		await nextFrame();
		expect( view.getSlides() ).toHaveLength( 2 );
		expect( onRender ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'shows only the latest content passed within a frame', async () => {
		const onRender = vi.fn();
		const view = createSlideView( document.body, onRender );
		const first = vi.fn( () => renderSlides( '---\nmarp: true\n---\n' ) );
		view.render( first );
		view.render( { notice: 'Not a Marp document' } );

		await nextFrame();
		expect( first ).not.toHaveBeenCalled();
		expect( onRender ).toHaveBeenCalledTimes( 1 );
		expect( document.querySelector( '.preview-notice' ) ).toMatchObject( {
			hidden: false,
			textContent: 'Not a Marp document',
		} );
	} );

	it( 'replaces the slides with a notice', async () => {
		const view = createSlideView( document.body );
		view.render( renderSlides( '---\nmarp: true\n---\n\nA\n' ) );
		await nextFrame();
		view.render( { notice: 'Not a Marp document' } );
		await nextFrame();

		expect( view.getSlides() ).toHaveLength( 0 );
		expect( document.head.querySelector( 'style' )?.textContent ).toBe(
			''
		);
	} );

	it( 'points KaTeX at the bundled fonts', async () => {
		const view = createSlideView( document.body );
		view.render(
			renderSlides( '---\nmarp: true\nmath: katex\n---\n\n$$\nx^2\n$$\n' )
		);
		await nextFrame();

		const css = document.head.querySelector( 'style' )?.textContent;
		expect( css ).toContain( 'KaTeX_Main' );
		expect( css ).not.toMatch( /url\(['"]?fonts\// );
	} );
} );
