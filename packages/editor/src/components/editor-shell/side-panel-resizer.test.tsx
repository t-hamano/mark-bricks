// @vitest-environment jsdom

/**
 * External dependencies
 */
import { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Internal dependencies
 */
import { SidePanelResizer } from './side-panel-resizer';

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
 ).IS_REACT_ACT_ENVIRONMENT = true;

function rect( left: number, width: number ): DOMRect {
	return { left, right: left + width, width } as DOMRect;
}

describe( 'SidePanelResizer', () => {
	let container: HTMLDivElement;
	let root: Root;
	const content = document.createElement( 'main' );
	const sidePanel = document.createElement( 'div' );
	const contentRef = createRef< HTMLElement >();
	const sidePanelRef = createRef< HTMLElement >();
	( contentRef as { current: HTMLElement } ).current = content;
	( sidePanelRef as { current: HTMLElement } ).current = sidePanel;
	// The content spans 0–500 and the side panel 500–1000.
	content.getBoundingClientRect = () => rect( 0, 500 );
	sidePanel.getBoundingClientRect = () => rect( 500, 500 );

	beforeEach( () => {
		container = document.createElement( 'div' );
		document.body.appendChild( container );
		root = createRoot( container );
	} );

	afterEach( () => {
		act( () => root.unmount() );
		container.remove();
	} );

	function renderResizer( onChange: ( size: number ) => void, size = 50 ) {
		act( () =>
			root.render(
				<SidePanelResizer
					contentRef={ contentRef }
					sidePanelRef={ sidePanelRef }
					size={ size }
					onChange={ onChange }
				/>
			)
		);
		const bar = container.querySelector( '[role="separator"]' )!;
		return bar as HTMLElement;
	}

	function pointer( target: EventTarget, type: string, clientX: number ) {
		const event = new MouseEvent( type, {
			bubbles: true,
			button: 0,
			clientX,
		} );
		Object.defineProperty( event, 'pointerId', { value: 1 } );
		act( () => {
			target.dispatchEvent( event );
		} );
	}

	it( 'sets the side panel to the share of the width right of the pointer', () => {
		const onChange = vi.fn();
		const bar = renderResizer( onChange );
		pointer( bar, 'pointerdown', 500 );
		pointer( window, 'pointermove', 300 );
		expect( onChange ).toHaveBeenLastCalledWith( 70 );
		pointer( window, 'pointerup', 300 );
		pointer( window, 'pointermove', 800 );
		expect( onChange ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'keeps the side panel between 30% and 90% of the width', () => {
		const onChange = vi.fn();
		const bar = renderResizer( onChange );
		pointer( bar, 'pointerdown', 500 );
		pointer( window, 'pointermove', 0 );
		expect( onChange ).toHaveBeenLastCalledWith( 90 );
		pointer( window, 'pointermove', 1000 );
		expect( onChange ).toHaveBeenLastCalledWith( 30 );
	} );

	it( 'moves with the arrow keys', () => {
		const onChange = vi.fn();
		const bar = renderResizer( onChange );
		act( () => {
			bar.dispatchEvent(
				new KeyboardEvent( 'keydown', {
					key: 'ArrowLeft',
					bubbles: true,
				} )
			);
		} );
		expect( onChange ).toHaveBeenLastCalledWith( 55 );
		act( () => {
			bar.dispatchEvent(
				new KeyboardEvent( 'keydown', {
					key: 'ArrowRight',
					bubbles: true,
				} )
			);
		} );
		expect( onChange ).toHaveBeenLastCalledWith( 45 );
	} );

	it( 'removes its overlay when it goes away mid-drag', () => {
		const bar = renderResizer( vi.fn() );
		pointer( bar, 'pointerdown', 500 );
		const overlay = '.editor-shell__side-panel-resize-overlay';
		expect( document.querySelector( overlay ) ).not.toBeNull();
		act( () => root.render( null ) );
		expect( document.querySelector( overlay ) ).toBeNull();
	} );
} );
