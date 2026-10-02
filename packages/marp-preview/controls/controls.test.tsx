// @vitest-environment jsdom

/**
 * External dependencies
 */
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Internal dependencies
 */
import type { PreviewLabels } from '..';
import { createPreviewControls } from './controls';

const labels: PreviewLabels = {
	enterSlideMode: 'Enter slide mode',
	exitSlideMode: 'Exit slide mode',
	exitSlideModeHint: 'Press Escape to exit',
	previousSlide: 'Previous slide',
	nextSlide: 'Next slide',
	slideNumber: 'Slide number',
};

function getButton( name: string ) {
	return Array.from( document.querySelectorAll( 'button' ) ).find(
		( button ) =>
			button.textContent === name ||
			button.getAttribute( 'aria-label' ) === name
	);
}

describe( 'createPreviewControls', () => {
	beforeEach( () => {
		document.body.innerHTML = '';
		Object.assign( globalThis, { IS_REACT_ACT_ENVIRONMENT: true } );
	} );

	it( 'shows nothing until the labels arrive', () => {
		act( () => {
			createPreviewControls( vi.fn(), vi.fn() );
		} );
		expect( document.querySelector( '.preview-toolbar' ) ).toBeNull();
	} );

	it( 'toggles the slide mode with the button', () => {
		const toggle = vi.fn();
		const controls = createPreviewControls( toggle, vi.fn() );
		act( () => controls.setLabels( labels ) );

		act( () => getButton( 'Enter slide mode' )?.click() );
		expect( toggle ).toHaveBeenCalledTimes( 1 );

		act( () => controls.setSlideMode( true ) );
		expect( getButton( 'Exit slide mode' ) ).toBeDefined();
	} );

	it( 'shows the hint on entering the slide mode', () => {
		const controls = createPreviewControls( vi.fn(), vi.fn() );
		act( () => controls.setLabels( labels ) );
		act( () => controls.setSlideMode( true ) );

		const hint = document.querySelector( '.preview-hint' );
		expect( hint?.textContent ).toBe( 'Press Escape to exit' );
		expect( hint?.classList.contains( 'is-visible' ) ).toBe( true );
	} );

	it( 'moves between the slides with the pager', () => {
		const navigate = vi.fn();
		const controls = createPreviewControls( vi.fn(), navigate );
		act( () => controls.setLabels( labels ) );
		act( () => controls.setSlide( 1, 3 ) );

		act( () => getButton( 'Next slide' )?.click() );
		expect( navigate ).toHaveBeenLastCalledWith( 2 );
		act( () => getButton( 'Previous slide' )?.click() );
		expect( navigate ).toHaveBeenLastCalledWith( 0 );
	} );

	it( 'disables the pager buttons at either end', () => {
		const controls = createPreviewControls( vi.fn(), vi.fn() );
		act( () => controls.setLabels( labels ) );
		act( () => controls.setSlide( 0, 1 ) );

		// The buttons stay focusable while disabled.
		expect(
			getButton( 'Previous slide' )?.getAttribute( 'aria-disabled' )
		).toBe( 'true' );
		expect(
			getButton( 'Next slide' )?.getAttribute( 'aria-disabled' )
		).toBe( 'true' );
	} );
} );
