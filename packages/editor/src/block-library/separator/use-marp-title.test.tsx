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
import { useMarpSeparatorTitle } from './use-marp-title';

type BlockType = { name: string; title: string };

// A stand-in for the blocks store, keyed by block name.
const blockTypes = new Map< string, BlockType >();
const registry = {
	select: () => ( {
		getBlockType: ( name: string ) => blockTypes.get( name ),
	} ),
	dispatch: () => ( {
		addBlockTypes: ( blockType: BlockType ) =>
			blockTypes.set( blockType.name, blockType ),
	} ),
};

vi.mock( '@wordpress/blocks', () => ( { store: {} } ) );
vi.mock( '@wordpress/data', () => ( { useRegistry: () => registry } ) );

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
 ).IS_REACT_ACT_ENVIRONMENT = true;

function Probe( { isMarp }: { isMarp: boolean } ) {
	useMarpSeparatorTitle( isMarp );
	return null;
}

const title = () => blockTypes.get( 'core/separator' )?.title;

describe( 'useMarpSeparatorTitle', () => {
	let root: Root;

	const render = ( isMarp: boolean ) =>
		act( () => root.render( <Probe isMarp={ isMarp } /> ) );

	beforeEach( () => {
		blockTypes.set( 'core/separator', {
			name: 'core/separator',
			title: 'Separator',
		} );
		root = createRoot( document.createElement( 'div' ) );
	} );

	afterEach( () => {
		act( () => root.unmount() );
	} );

	it( 'keeps the title outside Marp', () => {
		render( false );
		expect( title() ).toBe( 'Separator' );
	} );

	it( 'renames the block in Marp and restores it when turned off', () => {
		render( true );
		expect( title() ).toBe( 'Slide Separator' );
		render( false );
		expect( title() ).toBe( 'Separator' );
	} );

	it( 'restores the title on unmount', () => {
		render( true );
		act( () => root.unmount() );
		expect( title() ).toBe( 'Separator' );
		root = createRoot( document.createElement( 'div' ) );
	} );
} );
