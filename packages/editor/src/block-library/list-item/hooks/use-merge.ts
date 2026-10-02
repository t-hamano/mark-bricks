/**
 * WordPress dependencies
 */
import { useRegistry, useDispatch, useSelect } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { isUnmodifiedBlock } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import useOutdentListItem from './use-outdent-list-item';

export default function useMerge(
	clientId: string,
	onMerge: ( forward?: boolean ) => void
) {
	const registry = useRegistry();
	const {
		getPreviousBlockClientId,
		getNextBlockClientId,
		getBlockOrder,
		getBlockRootClientId,
		getBlockName,
		getBlock,
	} = useSelect( blockEditorStore );
	const dispatch = useDispatch( blockEditorStore );
	const {
		mergeBlocks,
		removeBlock,
		// @ts-expect-error @types is outdated and missing moveBlocksToPosition on this dispatch type.
		moveBlocksToPosition,
	} = dispatch;
	const outdentListItem = useOutdentListItem();

	function isList( id: string | undefined ) {
		return !! id && getBlockName( id ) === 'core/list';
	}

	// Only list item text can be merged, so there is no trailing id when an
	// item ends with a block other than a nested list (a paragraph, ...).
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

	return ( forward?: boolean ) => {
		function mergeWithNested( clientIdA: string, clientIdB: string ) {
			registry.batch( () => {
				const innerBlockIds = getBlockOrder( clientIdB );
				if ( innerBlockIds.length ) {
					// Blocks other than nested lists stay with the merged text,
					// so every inner block moves into the item merged into.
					if (
						( getPreviousBlockClientId( clientIdB ) === clientIdA &&
							! getBlockOrder( clientIdA ).length ) ||
						! innerBlockIds.every( isList )
					) {
						moveBlocksToPosition(
							innerBlockIds,
							clientIdB,
							clientIdA
						);
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
			// Text followed by a block other than a nested list (a
			// paragraph, ...) has no list item text to merge with.
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
				outdentListItem( nextBlockClientId );
			} else {
				mergeWithNested( clientId, nextBlockClientId );
			}
		} else {
			if ( getParentListItemId( clientId ) ) {
				outdentListItem( clientId );
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

			// Only an item holding nothing but a nested list is replaced by
			// the list's items; any other inner block would be removed with it.
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
					outdentListItem( nestedListItemIds );
					removeBlock( clientId, true );
				} );
			} else {
				onMerge( forward );
			}
		}
	};
}
