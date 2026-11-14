/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import { blocksToMarkdown, markdownToBlocks } from '../converter';
import {
	createBlockEditTarget,
	type BlockEditorAccess,
} from './block-edit-target';

// A block editor holding `markdown`, with the blocks at `selected` (top-level
// indexes) selected. `nested` selects the first inner block of each instead.
function setup(
	markdown: string,
	selected: number[] = [],
	{ nested = false } = {}
) {
	let blocks = markdownToBlocks( markdown );
	const parents = new Map< string, string >();
	for ( const block of blocks ) {
		for ( const inner of block.innerBlocks ) {
			parents.set( inner.clientId, block.clientId );
		}
	}
	const selection = selected.map( ( index ) =>
		nested
			? blocks[ index ].innerBlocks[ 0 ].clientId
			: blocks[ index ].clientId
	);
	const access: BlockEditorAccess = {
		getBlocks: () => blocks,
		getSelectedBlockClientIds: () => selection,
		getBlockHierarchyRootClientId: ( clientId ) =>
			parents.get( clientId ) ?? clientId,
		replaceBlocks: ( clientIds, newBlocks ) => {
			const start = blocks.findIndex(
				( block ) => block.clientId === clientIds[ 0 ]
			);
			blocks = [
				...blocks.slice( 0, start ),
				...newBlocks,
				...blocks.slice( start + clientIds.length ),
			];
		},
		insertBlocks: ( newBlocks, index = blocks.length ) => {
			blocks = [
				...blocks.slice( 0, index ),
				...newBlocks,
				...blocks.slice( index ),
			];
		},
	};
	return {
		access,
		getMarkdown: () => blocksToMarkdown( blocks ),
		remove: ( index: number ) => {
			blocks = blocks.filter( ( _block: Block, i ) => i !== index );
		},
	};
}

const DOCUMENT = '# Title\n\nFirst.\n\nSecond.\n\nThird.\n';

describe( 'createBlockEditTarget', () => {
	describe( 'getContext', () => {
		it( 'returns the selected blocks and marks them in the document', () => {
			const { access } = setup( DOCUMENT, [ 1, 2 ] );
			expect( createBlockEditTarget( access ).getContext() ).toEqual( {
				selection: 'First.\n\nSecond.\n',
				document:
					'# Title\n\n<selection>\nFirst.\n\nSecond.\n</selection>\n\nThird.\n',
			} );
		} );

		it( 'marks the end of the document when nothing is selected', () => {
			const { access } = setup( DOCUMENT );
			expect( createBlockEditTarget( access ).getContext() ).toEqual( {
				selection: '',
				document:
					'# Title\n\nFirst.\n\nSecond.\n\nThird.\n\n<selection></selection>\n',
			} );
		} );

		it( 'selects the top-level block that contains a nested selection', () => {
			const { access } = setup( 'Intro.\n\n- One\n- Two\n', [ 1 ], {
				nested: true,
			} );
			expect(
				createBlockEditTarget( access ).getContext().selection
			).toBe( '- One\n- Two\n' );
		} );

		it( 'includes the front matter in the document', () => {
			const { access } = setup( DOCUMENT, [ 0 ] );
			expect(
				createBlockEditTarget( access, 'marp: true' ).getContext()
					.document
			).toBe(
				'---\nmarp: true\n---\n\n<selection>\n# Title\n</selection>\n\nFirst.\n\nSecond.\n\nThird.\n'
			);
		} );
	} );

	describe( 'apply', () => {
		it( 'replaces the selected blocks', () => {
			const { access, getMarkdown } = setup( DOCUMENT, [ 1, 2 ] );
			const target = createBlockEditTarget( access );
			expect(
				target.apply( { action: 'replace', markdown: '- New\n' } )
			).toBe( true );
			expect( getMarkdown() ).toBe( '# Title\n\n- New\n\nThird.\n' );
		} );

		it( 'inserts after the selected blocks', () => {
			const { access, getMarkdown } = setup( DOCUMENT, [ 1 ] );
			createBlockEditTarget( access ).apply( {
				action: 'insert_after',
				markdown: 'New.\n',
			} );
			expect( getMarkdown() ).toBe(
				'# Title\n\nFirst.\n\nNew.\n\nSecond.\n\nThird.\n'
			);
		} );

		it( 'adds to the end of the document when nothing is selected', () => {
			const { access, getMarkdown } = setup( DOCUMENT );
			createBlockEditTarget( access ).apply( {
				action: 'replace',
				markdown: 'New.\n',
			} );
			expect( getMarkdown() ).toBe( DOCUMENT + '\nNew.\n' );
		} );

		it( 'edits the selection captured when the target was created', () => {
			const { access, getMarkdown } = setup( DOCUMENT, [ 1 ] );
			const target = createBlockEditTarget( access );
			// The user selects another block before the edit arrives.
			access.getSelectedBlockClientIds = () => [
				access.getBlocks()[ 3 ].clientId,
			];
			target.apply( { action: 'replace', markdown: 'New.\n' } );
			expect( getMarkdown() ).toBe(
				'# Title\n\nNew.\n\nSecond.\n\nThird.\n'
			);
		} );

		it( 'moves front matter in the edit into the document front matter', () => {
			const { access, getMarkdown } = setup( DOCUMENT );
			let frontMatter: string | null = null;
			createBlockEditTarget( access, null, ( next ) => {
				frontMatter = next;
			} ).apply( {
				action: 'replace',
				markdown:
					'---\n\nmarp: true\ntheme: default\n\n--------------\n\n# Slide\n',
			} );
			expect( frontMatter ).toBe( 'marp: true\ntheme: default' );
			expect( getMarkdown() ).toBe( DOCUMENT + '\n# Slide\n' );
		} );

		it( 'changes nothing when the selection no longer exists', () => {
			const { access, getMarkdown, remove } = setup( DOCUMENT, [ 1 ] );
			const target = createBlockEditTarget( access );
			remove( 1 );
			expect(
				target.apply( { action: 'replace', markdown: 'New.\n' } )
			).toBe( false );
			expect( getMarkdown() ).toBe( '# Title\n\nSecond.\n\nThird.\n' );
		} );
	} );
} );
