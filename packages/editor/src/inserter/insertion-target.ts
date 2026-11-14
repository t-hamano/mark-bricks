/**
 * External dependencies
 */
import { useCallback, useEffect, useMemo } from 'react';

/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import { isUnmodifiedDefaultBlock } from '@wordpress/blocks';
import { useRegistry } from '@wordpress/data';

type Registry = ReturnType< typeof useRegistry >;

export type InsertionTarget = {
	/** Top-level index where the new blocks go. */
	index: number;
	/** Client ID of an empty paragraph to replace instead of inserting. */
	replaceClientId?: string;
};

/**
 * Where the inserter sidebar puts new blocks: after the top-level block that
 * holds the selection, or at the end of the document. An empty paragraph
 * there is replaced.
 *
 * @param registry Data registry.
 */
export function getInsertionTarget( registry: Registry ): InsertionTarget {
	const {
		getBlock,
		getBlockOrder,
		getBlockHierarchyRootClientId,
		getSelectedBlockClientId,
	} = registry.select( blockEditorStore );

	const order = getBlockOrder( '' );
	const selected = getSelectedBlockClientId();
	const root = selected ? getBlockHierarchyRootClientId( selected ) : null;
	const rootIndex = root ? order.indexOf( root ) : -1;
	if ( rootIndex === -1 ) {
		return { index: order.length };
	}

	const rootBlock = getBlock( order[ rootIndex ] );
	if ( rootBlock && isUnmodifiedDefaultBlock( rootBlock ) ) {
		return { index: rootIndex, replaceClientId: rootBlock.clientId };
	}
	return { index: rootIndex + 1 };
}

/**
 * Shows the canvas insertion point where the inserter sidebar would put new
 * blocks, while an item is hovered or focused.
 */
export function useInsertionPointPreview() {
	const registry = useRegistry();

	const show = useCallback( () => {
		const { index, replaceClientId } = getInsertionTarget( registry );
		// An empty paragraph gets replaced; mark the gap right after it.
		registry
			.dispatch( blockEditorStore )
			.showInsertionPoint( '', replaceClientId ? index + 1 : index );
	}, [ registry ] );

	const hide = useCallback( () => {
		registry.dispatch( blockEditorStore ).hideInsertionPoint();
	}, [ registry ] );

	// The list can go away while an item is still hovered.
	useEffect( () => hide, [ hide ] );

	return useMemo( () => ( { show, hide } ), [ show, hide ] );
}
