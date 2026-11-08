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
import { markdownToBlocks } from '../../converter';
import { SourceLineSync, type SourceLineSyncHandle } from './source-line-sync';

// The root of the selected block, which the tests set.
let selectedRoot: string | null = null;
const selectBlock = vi.fn();
const registry = {
	select: () => ( { getSelectedBlockClientId: () => selectedRoot } ),
};

vi.mock( '@wordpress/block-editor', () => ( { store: {} } ) );
vi.mock( '@wordpress/data', () => ( {
	useSelect: ( mapSelect: ( select: () => unknown ) => unknown ) =>
		mapSelect( () => ( {
			getBlockSelectionStart: () => selectedRoot,
			getBlockHierarchyRootClientId: ( clientId: string ) => clientId,
		} ) ),
	useDispatch: () => ( { selectBlock } ),
	useRegistry: () => registry,
} ) );

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
 ).IS_REACT_ACT_ENVIRONMENT = true;

// `# A` at line 4, and `B` at line 6, after the front matter.
const FRONT_MATTER = 'marp: true';
const blocks = markdownToBlocks( '# A\n\nB\n' );

describe( 'SourceLineSync', () => {
	let root: Root;
	const handleRef = createRef< SourceLineSyncHandle >();
	const onSelectedLineChange = vi.fn();

	function render( enabled = true ) {
		act( () =>
			root.render(
				<SourceLineSync
					blocks={ blocks }
					frontMatter={ FRONT_MATTER }
					enabled={ enabled }
					onSelectedLineChange={ onSelectedLineChange }
					handleRef={ handleRef }
				/>
			)
		);
	}

	beforeEach( () => {
		selectedRoot = null;
		root = createRoot( document.createElement( 'div' ) );
	} );

	afterEach( () => {
		act( () => root.unmount() );
		vi.clearAllMocks();
	} );

	it( 'reports the line of the selected block when it changes', () => {
		render();
		expect( onSelectedLineChange ).not.toHaveBeenCalled();

		selectedRoot = blocks[ 1 ].clientId;
		render();
		expect( onSelectedLineChange ).toHaveBeenLastCalledWith( 6 );

		render();
		expect( onSelectedLineChange ).toHaveBeenCalledTimes( 1 );

		selectedRoot = null;
		render();
		expect( onSelectedLineChange ).toHaveBeenLastCalledWith( null );
	} );

	it( 'reports no line in the code editor', () => {
		selectedRoot = blocks[ 0 ].clientId;
		render();
		expect( onSelectedLineChange ).toHaveBeenLastCalledWith( 4 );

		render( false );
		expect( onSelectedLineChange ).toHaveBeenLastCalledWith( null );
	} );

	it( 'selects the block of a line', () => {
		render();
		handleRef.current?.selectLine( 6 );
		expect( selectBlock ).toHaveBeenLastCalledWith( blocks[ 1 ].clientId );
		handleRef.current?.selectLine( 1 );
		expect( selectBlock ).toHaveBeenLastCalledWith( blocks[ 0 ].clientId );
	} );

	it( 'scrolls to the block of a line when it is already selected', () => {
		const element = document.createElement( 'div' );
		element.id = `block-${ blocks[ 1 ].clientId }`;
		element.scrollIntoView = vi.fn();
		document.body.append( element );
		selectedRoot = blocks[ 1 ].clientId;
		render();

		handleRef.current?.selectLine( 6 );
		expect( selectBlock ).not.toHaveBeenCalled();
		expect( element.scrollIntoView ).toHaveBeenCalledWith( {
			block: 'nearest',
		} );
		element.remove();
	} );

	it( 'selects nothing in the code editor', () => {
		render( false );
		handleRef.current?.selectLine( 6 );
		expect( selectBlock ).not.toHaveBeenCalled();
	} );
} );
