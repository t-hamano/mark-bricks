/**
 * WordPress dependencies
 */
import { useRegistry, type DataRegistry } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { isUnmodifiedBlock } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import { outdentListItem } from './use-outdent-list-item';

/**
 * Merges a list item's text with the item before or after it.
 *
 * A nested item right after the text is lifted up instead of merged. The text
 * of a list item is only merged with the text of another list item: when the
 * text is followed, or the previous item ends, with a block other than a
 * nested list (a paragraph, a code block, ...), nothing happens.
 *
 * @param registry Data registry holding the block editor store.
 * @param clientId Client ID of the list item being merged.
 * @param onMerge  The block's default merge handler, called when there is no
 *                 list item to merge with.
 * @param forward  Whether the following item is merged into this one.
 */
export function mergeListItem(
	registry: DataRegistry,
	clientId: string,
	onMerge: ( forward?: boolean ) => void,
	forward?: boolean
) {
	const {
		getPreviousBlockClientId,
		getNextBlockClientId,
		getBlockOrder,
		getBlockRootClientId,
		getBlockName,
		getBlock,
	} = registry.select( blockEditorStore );
	const {
		mergeBlocks,
		removeBlock,
		// @ts-expect-error @types is outdated and missing moveBlocksToPosition on this dispatch type.
		moveBlocksToPosition,
	} = registry.dispatch( blockEditorStore );

	function isList( id: string | undefined ) {
		return !! id && getBlockName( id ) === 'core/list';
	}

	/**
	 * Finds the list item whose text ends the block, descending through the
	 * last nested list of each item. Returns `undefined` when an item ends
	 * with a block other than a nested list.
	 *
	 * @param id Client ID of a list or list item.
	 * @return Client ID of the trailing block.
	 */
	function getTrailingId( id: string ): string | undefined {
		const order = getBlockOrder( id );

		if ( ! order.length ) {
			return id;
		}

		const lastId = order[ order.length - 1 ];
		if ( getBlockName( id ) === 'core/list-item' && ! isList( lastId ) ) {
			return;
		}

		return getTrailingId( lastId );
	}

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

	function _getNextId( id: string ): string | undefined {
		const next = getNextBlockClientId( id );
		if ( next ) {
			return next;
		}
		const parentListItemId = getParentListItemId( id );
		if ( ! parentListItemId ) {
			return;
		}
		return _getNextId( parentListItemId );
	}

	function getNextId( id: string ) {
		const order = getBlockOrder( id );

		if ( ! order.length ) {
			return _getNextId( id );
		}

		return getBlockOrder( order[ 0 ] )[ 0 ];
	}

	function mergeWithNested( clientIdA: string, clientIdB: string ) {
		registry.batch( () => {
			const innerBlockIds = getBlockOrder( clientIdB );
			if ( innerBlockIds.length ) {
				// Blocks other than nested lists stay with the merged text, so
				// every inner block moves into the item they are merged into.
				if (
					( getPreviousBlockClientId( clientIdB ) === clientIdA &&
						! getBlockOrder( clientIdA ).length ) ||
					! innerBlockIds.every( isList )
				) {
					moveBlocksToPosition( innerBlockIds, clientIdB, clientIdA );
				} else {
					const rootIdA = getBlockRootClientId( clientIdA );
					if ( rootIdA ) {
						innerBlockIds.forEach( ( nestedListClientId ) =>
							moveBlocksToPosition(
								getBlockOrder( nestedListClientId ),
								nestedListClientId,
								rootIdA
							)
						);
					}
				}
			}
			mergeBlocks( clientIdA, clientIdB );
		} );
	}

	if ( forward ) {
		const [ firstInnerBlockId ] = getBlockOrder( clientId );
		if ( firstInnerBlockId && ! isList( firstInnerBlockId ) ) {
			return;
		}

		const nextBlockClientId = getNextId( clientId );

		if ( ! nextBlockClientId ) {
			onMerge( forward );
			return;
		}

		if ( getParentListItemId( nextBlockClientId ) ) {
			outdentListItem( registry, nextBlockClientId );
		} else {
			mergeWithNested( clientId, nextBlockClientId );
		}
	} else {
		if ( getParentListItemId( clientId ) ) {
			outdentListItem( registry, clientId );
			return;
		}
		const previousBlockClientId = getPreviousBlockClientId( clientId );
		if ( previousBlockClientId ) {
			const trailingId = getTrailingId( previousBlockClientId );
			if ( trailingId ) {
				mergeWithNested( trailingId, clientId );
			}
			return;
		}

		// Only an item holding nothing but a nested list is replaced by the
		// list's items; any other inner block would be removed with it.
		const blockOrder = getBlockOrder( clientId );
		const currentBlock = getBlock( clientId );
		const nestedListItemIds =
			blockOrder.length === 1 && isList( blockOrder[ 0 ] )
				? getBlockOrder( blockOrder[ 0 ] )
				: [];
		if (
			!! currentBlock &&
			isUnmodifiedBlock( currentBlock ) &&
			nestedListItemIds.length > 0
		) {
			registry.batch( () => {
				outdentListItem( registry, nestedListItemIds );
				removeBlock( clientId, true );
			} );
		} else {
			onMerge( forward );
		}
	}
}

export default function useMerge(
	clientId: string,
	onMerge: ( forward?: boolean ) => void
) {
	const registry = useRegistry();
	return ( forward?: boolean ) =>
		mergeListItem( registry, clientId, onMerge, forward );
}
