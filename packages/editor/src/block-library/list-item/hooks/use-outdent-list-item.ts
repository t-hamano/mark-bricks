/**
 * WordPress dependencies
 */
import { useCallback } from '@wordpress/element';
import { useSelect, useDispatch, useRegistry } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { cloneBlock } from '@wordpress/blocks';

export default function useOutdentListItem() {
	const registry = useRegistry();
	const dispatch = useDispatch( blockEditorStore ) as unknown as {
		moveBlocksToPosition: (
			clientIds: string[],
			fromRootClientId: string,
			toRootClientId: string,
			index?: number
		) => void;
		removeBlock: ( clientId: string, selectPrevious?: boolean ) => void;
		insertBlock: (
			block: unknown,
			index: number,
			rootClientId: string,
			updateSelection: boolean
		) => void;
		updateBlockListSettings: (
			clientId: string,
			settings: unknown
		) => void;
	};
	const {
		moveBlocksToPosition,
		removeBlock,
		insertBlock,
		updateBlockListSettings,
	} = dispatch;
	const {
		getBlockRootClientId,
		getBlockName,
		getBlockOrder,
		getBlockIndex,
		getSelectedBlockClientIds,
		getBlock,
		getBlockListSettings,
	} = useSelect( blockEditorStore );

	function getParentListItemId( id: string ) {
		const listId = getBlockRootClientId( id );
		if ( ! listId ) {
			return;
		}
		const parentListItemId = getBlockRootClientId( listId );
		if ( ! parentListItemId ) {
			return;
		}
		if ( getBlockName( parentListItemId ) !== 'core/list-item' ) {
			return;
		}
		return parentListItemId;
	}

	return useCallback(
		( clientIdsParam?: string | string[] ) => {
			let clientIds: string[];
			if ( clientIdsParam === undefined ) {
				clientIds = getSelectedBlockClientIds();
			} else if ( ! Array.isArray( clientIdsParam ) ) {
				clientIds = [ clientIdsParam ];
			} else {
				clientIds = clientIdsParam;
			}

			if ( ! clientIds.length ) {
				return;
			}

			const firstClientId = clientIds[ 0 ];

			if ( getBlockName( firstClientId ) !== 'core/list-item' ) {
				return;
			}

			const parentListItemId = getParentListItemId( firstClientId );
			if ( ! parentListItemId ) {
				return;
			}

			const parentListId = getBlockRootClientId( firstClientId );
			if ( ! parentListId ) {
				return;
			}
			const lastClientId = clientIds[ clientIds.length - 1 ];
			const order = getBlockOrder( parentListId );
			const followingListItems = order.slice(
				getBlockIndex( lastClientId ) + 1
			);

			registry.batch( () => {
				if ( followingListItems.length ) {
					let nestedListId = getBlockOrder( firstClientId )[ 0 ];

					if ( ! nestedListId ) {
						const parentListBlock = getBlock( parentListId );
						if ( ! parentListBlock ) {
							return;
						}
						const nestedListBlock = cloneBlock(
							parentListBlock,
							{},
							[]
						);
						nestedListId = nestedListBlock.clientId;
						insertBlock( nestedListBlock, 0, firstClientId, false );
						const parentListSettings =
							getBlockListSettings( parentListId );
						if ( parentListSettings ) {
							updateBlockListSettings(
								nestedListId,
								parentListSettings
							);
						}
					}

					moveBlocksToPosition(
						followingListItems,
						parentListId,
						nestedListId
					);
				}
				moveBlocksToPosition(
					clientIds,
					parentListId,
					getBlockRootClientId( parentListItemId ) ?? '',
					getBlockIndex( parentListItemId ) + 1
				);
				if ( ! getBlockOrder( parentListId ).length ) {
					removeBlock( parentListId, false );
				}
			} );

			return true;
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[]
	);
}
