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

	function getTrailingId( id: string ): string {
		const order = getBlockOrder( id );

		if ( ! order.length ) {
			return id;
		}

		return getTrailingId( order[ order.length - 1 ] );
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
				const [ nestedListClientId ] = getBlockOrder( clientIdB );
				if ( nestedListClientId ) {
					if (
						getPreviousBlockClientId( clientIdB ) === clientIdA &&
						! getBlockOrder( clientIdA ).length
					) {
						moveBlocksToPosition(
							[ nestedListClientId ],
							clientIdB,
							clientIdA
						);
					} else {
						const rootIdA = getBlockRootClientId( clientIdA );
						if ( rootIdA ) {
							moveBlocksToPosition(
								getBlockOrder( nestedListClientId ),
								nestedListClientId,
								rootIdA
							);
						}
					}
				}
				mergeBlocks( clientIdA, clientIdB );
			} );
		}

		if ( forward ) {
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
				mergeWithNested( trailingId, clientId );
				return;
			}

			const blockOrder = getBlockOrder( clientId );
			const currentBlock = getBlock( clientId );
			const nestedListClientId = blockOrder[ 0 ];
			const nestedListItemIds = nestedListClientId
				? getBlockOrder( nestedListClientId )
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
