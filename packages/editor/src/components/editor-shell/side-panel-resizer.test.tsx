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
		( bar as HTMLElement ).setPointerCapture = vi.fn();
		( bar as HTMLElement ).hasPointerCapture = () => false;
		return bar as HTMLElement;
	}

	function pointer( bar: HTMLElement, type: string, clientX: number ) {
		const event = new MouseEvent( type, {
			bubbles: true,
			button: 0,
			clientX,
		} );
		Object.defineProperty( event, 'pointerId', { value: 1 } );
		act( () => {
			bar.dispatchEvent( event );
		} );
	}

	it( 'sets the side panel to the share of the width right of the pointer', () => {
		const onChange = vi.fn();
		const bar = renderResizer( onChange );
		pointer( bar, 'pointerdown', 500 );
		pointer( bar, 'pointermove', 300 );
		expect( onChange ).toHaveBeenLastCalledWith( 70 );
		pointer( bar, 'pointerup', 300 );
		pointer( bar, 'pointermove', 800 );
		expect( onChange ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'keeps both sides at least a tenth of the width', () => {
		const onChange = vi.fn();
		const bar = renderResizer( onChange );
		pointer( bar, 'pointerdown', 500 );
		pointer( bar, 'pointermove', 0 );
		expect( onChange ).toHaveBeenLastCalledWith( 90 );
		pointer( bar, 'pointermove', 1000 );
		expect( onChange ).toHaveBeenLastCalledWith( 10 );
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
} );
