/**
 * WordPress dependencies
 */
import { useCallback } from '@wordpress/element';
import { useRegistry, type DataRegistry } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { cloneBlock } from '@wordpress/blocks';

/**
 * Moves the given list items, or the selected blocks, one level up, right
 * after the list item they are nested in.
 *
 * The items following them in the same list become their children. They
 * continue the first moved item after all of its content, so they join its
 * nested list only when that list is the item's last block. Otherwise, e.g.
 * when the item ends with a paragraph, a new nested list is appended to it.
 *
 * @param registry      Data registry holding the block editor store.
 * @param clientIdParam Client ID(s) of the list items to outdent. Defaults to
 *                      the selected blocks.
 * @return `true` when the items were outdented.
 */
export function outdentListItem(
	registry: DataRegistry,
	clientIdParam?: string | string[]
): true | undefined {
	const {
		moveBlocksToPosition,
		removeBlock,
		insertBlock,
		updateBlockListSettings,
	} = registry.dispatch( blockEditorStore ) as unknown as {
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
		getBlockRootClientId,
		getBlockName,
		getBlockOrder,
		getBlockIndex,
		getSelectedBlockClientIds,
		getBlock,
		getBlockListSettings,
	} = registry.select( blockEditorStore );

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

	let clientIds: string[];
	if ( clientIdParam === undefined ) {
		clientIds = getSelectedBlockClientIds();
	} else if ( ! Array.isArray( clientIdParam ) ) {
		clientIds = [ clientIdParam ];
	} else {
		clientIds = clientIdParam;
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
	const followingListItems = order.slice( getBlockIndex( lastClientId ) + 1 );

	registry.batch( () => {
		if ( followingListItems.length ) {
			const innerBlockIds = getBlockOrder( firstClientId );
			const lastInnerBlockId = innerBlockIds[ innerBlockIds.length - 1 ];
			let nestedListId =
				lastInnerBlockId &&
				getBlockName( lastInnerBlockId ) === 'core/list'
					? lastInnerBlockId
					: undefined;

			if ( ! nestedListId ) {
				const parentListBlock = getBlock( parentListId );
				if ( ! parentListBlock ) {
					return;
				}
				const nestedListBlock = cloneBlock( parentListBlock, {}, [] );
				nestedListId = nestedListBlock.clientId;
				insertBlock(
					nestedListBlock,
					innerBlockIds.length,
					firstClientId,
					false
				);
				const parentListSettings = getBlockListSettings( parentListId );
				if ( parentListSettings ) {
					updateBlockListSettings( nestedListId, parentListSettings );
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
}

export default function useOutdentListItem() {
	const registry = useRegistry();
	return useCallback(
		( clientIdParam?: string | string[] ) =>
			outdentListItem( registry, clientIdParam ),
		[ registry ]
	);
}
