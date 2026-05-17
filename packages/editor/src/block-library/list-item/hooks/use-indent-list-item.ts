/**
 * WordPress dependencies
 */
import { useCallback } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { createBlock, cloneBlock } from '@wordpress/blocks';

export default function useIndentListItem( clientId: string ) {
	const { replaceBlocks, selectionChange, multiSelect } =
		useDispatch( blockEditorStore );
	const {
		getBlock,
		getPreviousBlockClientId,
		getSelectionStart,
		getSelectionEnd,
		hasMultiSelection,
		getMultiSelectedBlockClientIds,
	} = useSelect( blockEditorStore );
	return useCallback(
		() => {
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
			const clonedBlocks = sourceBlocks.map( ( block ) =>
				cloneBlock( block )
			);
			const newListItem = cloneBlock( previousSiblingBlock );
			if ( ! newListItem.innerBlocks?.length ) {
				newListItem.innerBlocks = [ createBlock( 'core/list' ) ];
			}
			newListItem.innerBlocks[
				newListItem.innerBlocks.length - 1
			].innerBlocks.push( ...clonedBlocks );

			const selectionStart = getSelectionStart();
			const selectionEnd = getSelectionEnd();
			replaceBlocks(
				[ previousSiblingId, ...clientIds ],
				[ newListItem ]
			);
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
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[ clientId ]
	);
}
