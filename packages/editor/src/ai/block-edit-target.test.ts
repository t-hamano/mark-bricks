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
		it( 'returns the document and where the selected blocks are in it', () => {
			const { access } = setup( DOCUMENT, [ 1, 2 ] );
			expect( createBlockEditTarget( access ).getContext() ).toEqual( {
				document: DOCUMENT,
				selection: 'First.\n\nSecond.\n',
				selectionStart: DOCUMENT.indexOf( 'First.' ),
				selectionEnd: DOCUMENT.indexOf( '\n\nThird.' ),
			} );
		} );

		it( 'places an empty selection at the end of the document', () => {
			const { access } = setup( DOCUMENT );
			expect( createBlockEditTarget( access ).getContext() ).toEqual( {
				document: DOCUMENT,
				selection: '',
				selectionStart: DOCUMENT.length,
				selectionEnd: DOCUMENT.length,
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
				'---\nmarp: true\n---\n\n# Title\n\nFirst.\n\nSecond.\n\nThird.\n'
			);
		} );

		it( 'reads the document as it is now, with the current front matter', () => {
			const { access } = setup( DOCUMENT, [ 1 ] );
			let frontMatter: string | null = 'marp: true';
			const target = createBlockEditTarget( access, frontMatter, {
				get: () => frontMatter,
				set: () => {},
				merge: () => {},
			} );
			target.apply( { action: 'replace', markdown: 'Changed.\n' } );
			frontMatter = 'marp: true\npaginate: true';
			expect( target.getDocument() ).toBe(
				'---\nmarp: true\npaginate: true\n---\n\n# Title\n\nChanged.\n\nSecond.\n\nThird.\n'
			);
		} );
	} );

	describe( 'apply', () => {
		it( 'replaces the selected blocks', () => {
			const { access, getMarkdown } = setup( DOCUMENT, [ 1, 2 ] );
			const target = createBlockEditTarget( access );
			expect(
				target.apply( { action: 'replace', markdown: '- New\n' } )
			).toEqual( { status: 'applied' } );
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
			createBlockEditTarget( access, null, {
				set: () => {},
				merge: ( next ) => {
					frontMatter = next;
				},
			} ).apply( {
				action: 'replace',
				markdown:
					'---\n\nmarp: true\ntheme: default\n\n--------------\n\n# Slide\n',
			} );
			expect( frontMatter ).toBe( 'marp: true\ntheme: default' );
			expect( getMarkdown() ).toBe( DOCUMENT + '\n# Slide\n' );
		} );

		it( 'reads the front matter it set before the host updates it', () => {
			const { access } = setup( DOCUMENT, [ 1 ] );
			// The host's front matter updates only after the next render.
			const target = createBlockEditTarget( access, 'marp: true', {
				get: () => 'marp: true',
				set: () => {},
				merge: () => {},
			} );
			target.apply( {
				action: 'replace',
				markdown: '---\nmarp: true\npaginate: true\n---\n',
			} );
			expect( target.getDocument() ).toMatch(
				/^---\nmarp: true\npaginate: true\n---\n/
			);
		} );

		it( 'keeps the selected blocks for a front matter only edit', () => {
			const { access, getMarkdown } = setup( DOCUMENT, [ 1 ] );
			let frontMatter: string | null = null;
			createBlockEditTarget( access, 'marp: true', {
				set: ( next ) => {
					frontMatter = next;
				},
				merge: () => {},
			} ).apply( {
				action: 'replace',
				markdown: '---\nmarp: true\ntheme: gaia\n---\n',
			} );
			expect( frontMatter ).toBe( 'marp: true\ntheme: gaia' );
			expect( getMarkdown() ).toBe( DOCUMENT );
		} );

		it( 'changes nothing when the selection no longer exists', () => {
			const { access, getMarkdown, remove } = setup( DOCUMENT, [ 1 ] );
			const target = createBlockEditTarget( access );
			remove( 1 );
			expect(
				target.apply( { action: 'replace', markdown: 'New.\n' } )
			).toEqual( { status: 'dropped' } );
			expect( getMarkdown() ).toBe( '# Title\n\nSecond.\n\nThird.\n' );
		} );
	} );

	describe( 'apply replace_text', () => {
		it( 'rebuilds only the block the text is in', () => {
			const { access, getMarkdown } = setup( DOCUMENT );
			const before = access.getBlocks();
			expect(
				createBlockEditTarget( access ).apply( {
					action: 'replace_text',
					find: 'Second.',
					markdown: 'Second, changed.',
				} )
			).toEqual( { status: 'applied' } );
			expect( getMarkdown() ).toBe(
				'# Title\n\nFirst.\n\nSecond, changed.\n\nThird.\n'
			);
			const after = access.getBlocks();
			expect( after[ 1 ].clientId ).toBe( before[ 1 ].clientId );
			expect( after[ 2 ].clientId ).not.toBe( before[ 2 ].clientId );
			expect( after[ 3 ].clientId ).toBe( before[ 3 ].clientId );
		} );

		it( 'edits text outside the selection', () => {
			const { access, getMarkdown } = setup( DOCUMENT, [ 3 ] );
			createBlockEditTarget( access ).apply( {
				action: 'replace_text',
				find: '# Title',
				markdown: '# A better title',
			} );
			expect( getMarkdown() ).toBe(
				'# A better title\n\nFirst.\n\nSecond.\n\nThird.\n'
			);
		} );

		it( 'replaces text that spans blocks with the blocks it becomes', () => {
			const { access, getMarkdown } = setup( DOCUMENT );
			createBlockEditTarget( access ).apply( {
				action: 'replace_text',
				find: 'First.\n\nSecond.',
				markdown: 'Both.',
			} );
			expect( getMarkdown() ).toBe( '# Title\n\nBoth.\n\nThird.\n' );
		} );

		it( 'fails when the text is not in the document', () => {
			const { access, getMarkdown } = setup( DOCUMENT );
			expect(
				createBlockEditTarget( access ).apply( {
					action: 'replace_text',
					find: 'Fourth.',
					markdown: 'New.',
				} )
			).toMatchObject( { status: 'failed' } );
			expect( getMarkdown() ).toBe( DOCUMENT );
		} );

		it( 'fails when the text is in more than one place', () => {
			const { access } = setup( DOCUMENT );
			const result = createBlockEditTarget( access ).apply( {
				action: 'replace_text',
				find: 'ir',
				markdown: 'New.',
			} );
			expect( result ).toMatchObject( { status: 'failed' } );
			expect( result.status === 'failed' && result.reason ).toContain(
				'2 times'
			);
		} );

		it( 'changes the front matter as its own step', () => {
			const { access, getMarkdown } = setup( DOCUMENT );
			let frontMatter: string | null = null;
			const result = createBlockEditTarget(
				access,
				'marp: true\ntheme: default',
				{
					set: ( next ) => {
						frontMatter = next;
					},
					merge: () => {},
				}
			).apply( {
				action: 'replace_text',
				find: 'theme: default',
				markdown: 'theme: gaia',
			} );
			expect( result ).toEqual( { status: 'applied' } );
			expect( frontMatter ).toBe( 'marp: true\ntheme: gaia' );
			expect( getMarkdown() ).toBe( DOCUMENT );
		} );

		it( 'reads the front matter as it is when the edit arrives', () => {
			const { access } = setup( DOCUMENT );
			let frontMatter: string | null = 'marp: true\ntheme: default';
			const result = createBlockEditTarget( access, 'marp: true', {
				get: () => frontMatter,
				set: ( next ) => {
					frontMatter = next;
				},
				merge: () => {},
			} ).apply( {
				action: 'replace_text',
				find: 'theme: default',
				markdown: 'theme: gaia',
			} );
			expect( result ).toEqual( { status: 'applied' } );
			expect( frontMatter ).toBe( 'marp: true\ntheme: gaia' );
		} );

		it( 'fails when the edit would push text out of the front matter', () => {
			const { access } = setup( DOCUMENT );
			let frontMatter: string | null = 'marp: true\ntheme: default';
			expect(
				createBlockEditTarget( access, frontMatter, {
					set: ( next ) => {
						frontMatter = next;
					},
					merge: () => {},
				} ).apply( {
					action: 'replace_text',
					find: 'theme: default',
					markdown: '---\nmarp: true\ntheme: gaia\n---',
				} )
			).toMatchObject( { status: 'failed' } );
			expect( frontMatter ).toBe( 'marp: true\ntheme: default' );
		} );

		it( 'fails when the edit would break the front matter', () => {
			const { access } = setup( DOCUMENT );
			expect(
				createBlockEditTarget( access, 'marp: true', {
					set: () => {},
					merge: () => {},
				} ).apply( {
					action: 'replace_text',
					find: 'marp: true\n---',
					markdown: 'marp: true',
				} )
			).toMatchObject( { status: 'failed' } );
		} );
	} );
} );
