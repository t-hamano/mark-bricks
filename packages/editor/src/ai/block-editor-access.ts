/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import type { DataRegistry } from '@wordpress/data';

/**
 * Internal dependencies
 */
import type { BlockEditorAccess } from './block-edit-target';

/**
 * Reads the block editor store of `registry` for `createBlockEditTarget`.
 *
 * @param registry The data registry the editor uses.
 * @return Block editor access.
 */
export function getBlockEditorAccess(
	registry: Pick< DataRegistry, 'select' | 'dispatch' >
): BlockEditorAccess {
	const select = registry.select( blockEditorStore );
	const dispatch = registry.dispatch( blockEditorStore );
	return {
		getBlocks: () => select.getBlocks(),
		getSelectedBlockClientIds: () => select.getSelectedBlockClientIds(),
		getBlockHierarchyRootClientId: ( clientId ) =>
			select.getBlockHierarchyRootClientId( clientId ),
		replaceBlocks: ( clientIds, blocks ) =>
			dispatch.replaceBlocks( clientIds, blocks ),
		insertBlocks: ( blocks, index ) =>
			dispatch.insertBlocks( blocks, index ),
	};
}
