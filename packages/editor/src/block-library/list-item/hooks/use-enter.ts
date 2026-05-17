/**
 * WordPress dependencies
 */
import { createBlock, getDefaultBlockName } from '@wordpress/blocks';
import { useRef } from '@wordpress/element';
import { useRefEffect } from '@wordpress/compose';
import { create } from '@wordpress/rich-text';
import { ENTER } from '@wordpress/keycodes';
import { useSelect, useDispatch } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';

/**
 * Internal dependencies
 */
import useOutdentListItem from './use-outdent-list-item';

type Props = {
	content: string;
	clientId: string;
	isTaskItem: boolean;
};

export default function useEnter( props: Props ) {
	const { replaceBlocks, selectionChange, insertBlock } =
		useDispatch( blockEditorStore );
	const {
		getBlock,
		getBlockRootClientId,
		getBlockIndex,
		getBlockName,
		getSelectionStart,
		getSelectionEnd,
	} = useSelect( blockEditorStore );
	const propsRef = useRef( props );
	propsRef.current = props;
	const outdentListItem = useOutdentListItem();

	return useRefEffect( ( element: HTMLElement ) => {
		function onKeyDown( event: KeyboardEvent ) {
			if ( event.defaultPrevented || event.keyCode !== ENTER ) {
				return;
			}
			const { content, clientId, isTaskItem } = propsRef.current;
			if ( content.length ) {
				// A non-empty item is split by the editor's default Enter
				// handling. A mid-content split copies attributes onto the
				// tail block, but pressing Enter at the very end inserts a
				// fresh default item instead. Re-create that trailing item as
				// a task item so the kind is inherited.
				if ( ! isTaskItem ) {
					return;
				}
				const selectionStart = getSelectionStart();
				const selectionEnd = getSelectionEnd();
				const atEnd =
					selectionStart.clientId === clientId &&
					selectionStart.offset === selectionEnd.offset &&
					selectionStart.offset ===
						create( { html: content } ).text.length;
				if ( ! atEnd ) {
					return;
				}
				event.preventDefault();
				const taskItem = createBlock( 'core/list-item', {
					markdownData: { checked: false },
				} );
				insertBlock(
					taskItem,
					getBlockIndex( clientId ) + 1,
					getBlockRootClientId( clientId ) ?? undefined
				);
				// Place the caret in the item's `content` RichText so typing
				// starts there instead of focusing the checkbox `input`.
				selectionChange( taskItem.clientId, 'content', 0, 0 );
				return;
			}
			event.preventDefault();
			const rootId = getBlockRootClientId( clientId );
			const grandRootId = rootId ? getBlockRootClientId( rootId ) : null;
			const canOutdent =
				!! grandRootId &&
				getBlockName( grandRootId ) === 'core/list-item';
			if ( canOutdent ) {
				outdentListItem();
				return;
			}
			const parentListClientId = getBlockRootClientId( clientId );
			if ( ! parentListClientId ) {
				return;
			}
			const topParentListBlock = getBlock( parentListClientId );
			if ( ! topParentListBlock ) {
				return;
			}
			const parentName = topParentListBlock.name;
			if ( typeof parentName !== 'string' ) {
				return;
			}
			const parentAttributes = topParentListBlock.attributes ?? {};
			const parentInnerBlocks = Array.isArray(
				topParentListBlock.innerBlocks
			)
				? topParentListBlock.innerBlocks
				: [];
			const blockIndex = getBlockIndex( clientId );
			if ( blockIndex < 0 || blockIndex >= parentInnerBlocks.length ) {
				return;
			}
			const defaultBlockName = getDefaultBlockName();
			if ( ! defaultBlockName ) {
				return;
			}
			const head = createBlock(
				parentName,
				parentAttributes,
				parentInnerBlocks.slice( 0, blockIndex )
			);
			const middle = createBlock( defaultBlockName );
			const after = [
				...( parentInnerBlocks[ blockIndex ]?.innerBlocks[ 0 ]
					?.innerBlocks || [] ),
				...parentInnerBlocks.slice( blockIndex + 1 ),
			];
			const tail = after.length
				? [ createBlock( parentName, parentAttributes, after ) ]
				: [];
			replaceBlocks( parentListClientId, [ head, middle, ...tail ], 1 );
			// @ts-expect-error @types signature is outdated; runtime supports selectionChange( clientId ).
			selectionChange( middle.clientId );
		}

		element.addEventListener( 'keydown', onKeyDown );
		return () => {
			element.removeEventListener( 'keydown', onKeyDown );
		};
	}, [] );
}
