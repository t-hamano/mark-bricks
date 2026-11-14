/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import {
	blocksToMarkdown,
	joinFrontMatter,
	markdownToBlocks,
} from '../converter';
import { joinWithSelectionMarkers, type EditTarget } from './edit-target';
import { splitAiFrontMatter } from './front-matter';

/**
 * The parts of the block editor store the target reads and changes.
 * `select( blockEditorStore )` and `dispatch( blockEditorStore )` provide
 * them.
 */
export type BlockEditorAccess = {
	getBlocks: () => Block[];
	getSelectedBlockClientIds: () => string[];
	getBlockHierarchyRootClientId: ( clientId: string ) => string;
	replaceBlocks: ( clientIds: string[], blocks: Block[] ) => void;
	insertBlocks: ( blocks: Block[], index?: number ) => void;
};

/**
 * Returns the top-level blocks that contain the selected blocks, in
 * document order. An edit replaces whole top-level blocks, so selecting a
 * list item edits the list it belongs to.
 *
 * @param access Block editor access.
 * @return Client IDs of the top-level blocks.
 */
function getSelectedRootClientIds( access: BlockEditorAccess ): string[] {
	const roots = new Set(
		access
			.getSelectedBlockClientIds()
			.map( ( clientId ) =>
				access.getBlockHierarchyRootClientId( clientId )
			)
	);
	return access
		.getBlocks()
		.map( ( block ) => block.clientId )
		.filter( ( clientId ) => roots.has( clientId ) );
}

/**
 * Creates the edit target for the visual editor, from the blocks selected
 * now. With no block selected, the selection is empty, and edits are added
 * at the end of the document.
 *
 * Front matter at the start of the model's Markdown replaces the
 * document's front matter instead of becoming blocks.
 *
 * @param access         Block editor access.
 * @param frontMatter    The document's front matter, sent as part of the
 *                       document.
 * @param setFrontMatter Replaces the document's front matter.
 * @return The edit target.
 */
export function createBlockEditTarget(
	access: BlockEditorAccess,
	frontMatter: string | null = null,
	setFrontMatter?: ( next: string ) => void
): EditTarget {
	const clientIds = getSelectedRootClientIds( access );

	return {
		getContext() {
			const blocks = access.getBlocks();
			const selected = new Set( clientIds );
			const indexes = blocks
				.map( ( block, index ) =>
					selected.has( block.clientId ) ? index : -1
				)
				.filter( ( index ) => index !== -1 );
			const start = indexes.length
				? Math.min( ...indexes )
				: blocks.length;
			const end = indexes.length ? Math.max( ...indexes ) + 1 : start;
			const selection = blocksToMarkdown( blocks.slice( start, end ) );
			return {
				selection,
				document: joinWithSelectionMarkers(
					joinFrontMatter(
						frontMatter,
						blocksToMarkdown( blocks.slice( 0, start ) )
					),
					selection,
					blocksToMarkdown( blocks.slice( end ) )
				),
			};
		},

		apply( { action, markdown } ) {
			const blocks = access.getBlocks();
			const indexes = clientIds.map( ( clientId ) =>
				blocks.findIndex( ( block ) => block.clientId === clientId )
			);
			if ( indexes.includes( -1 ) ) {
				return false;
			}
			const split = setFrontMatter
				? splitAiFrontMatter( markdown )
				: { frontMatter: null, body: markdown };
			if ( split.frontMatter !== null ) {
				setFrontMatter?.( split.frontMatter );
			}
			const newBlocks = markdownToBlocks( split.body );

			if ( clientIds.length === 0 ) {
				access.insertBlocks( newBlocks, blocks.length );
			} else if ( action === 'replace' ) {
				access.replaceBlocks( clientIds, newBlocks );
			} else {
				access.insertBlocks( newBlocks, Math.max( ...indexes ) + 1 );
			}
			return true;
		},
	};
}
