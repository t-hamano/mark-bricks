/**
 * WordPress dependencies
 */
import { useCallback } from '@wordpress/element';
import { useRegistry, type DataRegistry } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { createBlock, cloneBlock } from '@wordpress/blocks';

/**
 * Nests the given list item, or the multi-selected items, under the previous
 * sibling item.
 *
 * The items continue the previous item after all of its content, so they
 * join its nested list only when that list is the item's last block.
 * Otherwise, e.g. when the item ends with a paragraph, a new nested list is
 * appended to it.
 *
 * @param registry Data registry holding the block editor store.
 * @param clientId Client ID of the list item to indent.
 * @return Whether the items were indented.
 */
export function indentListItem(
	registry: DataRegistry,
	clientId: string
): boolean {
	const { replaceBlocks, selectionChange, multiSelect } =
		registry.dispatch( blockEditorStore );
	const {
		getBlock,
		getPreviousBlockClientId,
		getSelectionStart,
		getSelectionEnd,
		hasMultiSelection,
		getMultiSelectedBlockClientIds,
	} = registry.select( blockEditorStore );
	const previousSiblingId = getPreviousBlockClientId( clientId );
	if ( ! previousSiblingId ) {
		return false;
	}
	const _hasMultiSelection = hasMultiSelection();
	const clientIds = _hasMultiSelection
		? getMultiSelectedBlockClientIds()
		: [ clientId ];
	const sourceBlocks = clientIds
		.map( ( _clientId ) => getBlock( _clientId ) )
		.filter( ( block ) => !! block );
	if ( sourceBlocks.length !== clientIds.length ) {
		return false;
	}
	const previousSiblingBlock = getBlock( previousSiblingId );
	if ( ! previousSiblingBlock ) {
		return false;
	}
	const clonedBlocks = sourceBlocks.map( ( block ) => cloneBlock( block ) );
	const newListItem = cloneBlock( previousSiblingBlock );
	const lastInnerBlock =
		newListItem.innerBlocks[ newListItem.innerBlocks.length - 1 ];
	if ( lastInnerBlock?.name === 'core/list' ) {
		lastInnerBlock.innerBlocks.push( ...clonedBlocks );
	} else {
		newListItem.innerBlocks = [
			...newListItem.innerBlocks,
			createBlock( 'core/list', {}, clonedBlocks ),
		];
	}

	const selectionStart = getSelectionStart();
	const selectionEnd = getSelectionEnd();
	replaceBlocks( [ previousSiblingId, ...clientIds ], [ newListItem ] );
	if ( ! _hasMultiSelection ) {
		if ( ! selectionStart || ! selectionEnd?.attributeKey ) {
			return true;
		}
		if (
			typeof selectionStart.offset !== 'number' ||
			typeof selectionEnd.offset !== 'number'
		) {
			return true;
		}
		selectionChange(
			clonedBlocks[ 0 ].clientId,
			selectionEnd.attributeKey,
			selectionEnd.clientId === selectionStart.clientId
				? selectionStart.offset
				: selectionEnd.offset,
			selectionEnd.offset
		);
	} else {
		multiSelect(
			clonedBlocks[ 0 ].clientId,
			clonedBlocks[ clonedBlocks.length - 1 ].clientId
		);
	}

	return true;
}

export default function useIndentListItem( clientId: string ) {
	const registry = useRegistry();
	return useCallback(
		() => indentListItem( registry, clientId ),
		[ registry, clientId ]
	);
}
