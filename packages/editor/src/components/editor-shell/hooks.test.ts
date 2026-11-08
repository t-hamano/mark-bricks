// @vitest-environment jsdom

/**
 * External dependencies
 */
import { act, createElement, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import { blocksToMarkdown, markdownToBlocks } from '../../converter';
import { useMarkdownDocument } from './hooks';

// Only the conversion matters here: the block registry and the store the
// hooks file also uses for its other exports are left out.
vi.mock( '@wordpress/blocks', () => ( {
	createBlock: vi.fn(),
	isUnmodifiedDefaultBlock: vi.fn(),
} ) );
vi.mock( '@wordpress/block-editor', () => ( { store: {} } ) );
vi.mock( '@wordpress/compose', () => ( {
	useRefEffect: vi.fn(),
	// Emits right away, keeping the debounced function's identity stable.
	useDebounce: ( callback: ( ...args: unknown[] ) => void ) =>
		useMemo(
			() =>
				Object.assign( ( ...args: unknown[] ) => callback( ...args ), {
					cancel: () => {},
					flush: () => {},
				} ),
			[ callback ]
		),
} ) );
vi.mock( '@wordpress/data', () => ( {
	useDispatch: vi.fn(),
	useRegistry: vi.fn(),
} ) );
vi.mock( '@wordpress/style-runtime', () => ( { registerDocument: vi.fn() } ) );
vi.mock( '../../store', () => ( { store: {} } ) );

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
 ).IS_REACT_ACT_ENVIRONMENT = true;

const A = 'version A\n';
const B = 'version B\n';

// Renders the hook with `content`, passing what it emits back as its host does.
async function setup( content: string ) {
	const root = createRoot( document.createElement( 'div' ) );
	let current: ReturnType< typeof useMarkdownDocument >;

	const render = ( next: string ) =>
		root.render( createElement( Host, { content: next } ) );

	function Host( props: { content: string } ) {
		current = useMarkdownDocument( {
			content: props.content,
			onChange: render,
			isVisualMode: true,
		} );
		return null;
	}

	const setContent = ( next: string ) =>
		act( async () => {
			render( next );
		} );

	await setContent( content );

	return {
		setContent,
		getBlocks: () => current.blocks,
		getMarkdown: () => blocksToMarkdown( current.blocks ),
		edit: ( markdown: string ) =>
			act( async () => {
				current.onBlocksChange(
					markdownToBlocks( markdown ) as Block[]
				);
			} ),
	};
}

describe( 'useMarkdownDocument', () => {
	it( 'applies an external change', async () => {
		const { setContent, getMarkdown } = await setup( A );

		await setContent( B );

		expect( getMarkdown() ).toBe( B );
	} );

	it( 'applies an external change back to the initial content', async () => {
		const { setContent, getMarkdown } = await setup( A );

		await setContent( B );
		await setContent( A );

		expect( getMarkdown() ).toBe( A );
	} );

	it( 'applies an external change back to the last emitted content', async () => {
		const { edit, setContent, getMarkdown } = await setup( A );

		await edit( B );
		await setContent( A );
		await setContent( B );

		expect( getMarkdown() ).toBe( B );
	} );

	it( 'keeps the block tree when its own edit comes back as content', async () => {
		const { edit, getBlocks, getMarkdown } = await setup( A );

		// The host has rendered the emitted content by the time this resolves.
		await edit( B );
		const blocks = getBlocks();
		await act( async () => {} );

		expect( getMarkdown() ).toBe( B );
		expect( getBlocks() ).toBe( blocks );
	} );
} );
