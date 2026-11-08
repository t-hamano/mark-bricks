// @vitest-environment jsdom

/**
 * External dependencies
 */
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Internal dependencies
 */
import {
	createPreviewControls,
	type PlacementAction,
	type PreviewControls,
} from './controls';

// Creates the controls, which render their toolbar right away.
function setup(
	toggle = vi.fn(),
	navigate = vi.fn(),
	placementAction?: PlacementAction
) {
	let controls: PreviewControls | undefined;
	act( () => {
		controls = createPreviewControls( toggle, navigate, placementAction );
	} );
	return controls as PreviewControls;
}

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

	it( 'toggles the slide mode with the button', () => {
		const toggle = vi.fn();
		const controls = setup( toggle );

		act( () => getButton( 'Enter slide mode' )?.click() );
		expect( toggle ).toHaveBeenCalledTimes( 1 );

		act( () => controls.setSlideMode( true ) );
		expect( getButton( 'Exit slide mode' ) ).toBeDefined();
	} );

	it( 'shows the hint on entering the slide mode', () => {
		const controls = setup();
		act( () => controls.setSlideMode( true ) );

		const hint = document.querySelector( '.preview-hint' );
		expect( hint?.textContent ).toBe(
			'Press F or Escape to exit slide mode'
		);
		expect( hint?.classList.contains( 'is-visible' ) ).toBe( true );
	} );

	it( 'moves between the slides with the pager', () => {
		const navigate = vi.fn();
		const controls = setup( vi.fn(), navigate );
		act( () => controls.setSlide( 1, 3 ) );

		act( () => getButton( 'Next slide' )?.click() );
		expect( navigate ).toHaveBeenLastCalledWith( 2 );
		act( () => getButton( 'Previous slide' )?.click() );
		expect( navigate ).toHaveBeenLastCalledWith( 0 );
	} );

	it( 'offers to move the preview out of the panel', () => {
		const onClick = vi.fn();
		setup( vi.fn(), vi.fn(), { placement: 'panel', onClick } );

		act( () => getButton( 'Open in new window' )?.click() );
		expect( onClick ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'offers to move the preview back next to the editor', () => {
		setup( vi.fn(), vi.fn(), { placement: 'window', onClick: vi.fn() } );
		expect( getButton( 'Show next to editor' ) ).toBeDefined();
	} );

	it( 'hides the placement button in the slide mode', () => {
		const controls = setup( vi.fn(), vi.fn(), {
			placement: 'panel',
			onClick: vi.fn(),
		} );
		act( () => controls.setSlideMode( true ) );
		expect( getButton( 'Open in new window' ) ).toBeUndefined();
	} );

	it( 'disables the pager buttons at either end', () => {
		const controls = setup();
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
