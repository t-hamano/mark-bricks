/**
 * External dependencies
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import {
	setSlidePreviewPlacement,
	setSlidePreviewShown,
	useSlidePreviewPlacement,
} from './visibility';

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
 ).IS_REACT_ACT_ENVIRONMENT = true;

describe( 'slide preview visibility', () => {
	it( 'shows the preview next to the editor again after turning it off', () => {
		let placement: string | undefined;
		function Probe() {
			placement = useSlidePreviewPlacement();
			return null;
		}
		const root = createRoot( document.createElement( 'div' ) );
		act( () => root.render( <Probe /> ) );
		act( () => {
			setSlidePreviewShown( true );
			setSlidePreviewPlacement( 'window' );
		} );
		expect( placement ).toBe( 'window' );
		act( () => setSlidePreviewShown( false ) );
		expect( placement ).toBe( 'panel' );
		act( () => root.unmount() );
	} );
} );
