/**
 * WordPress dependencies
 */
import {
	createBlock,
	getDefaultBlockName,
	type Block,
} from '@wordpress/blocks';
import { useRef } from '@wordpress/element';
import { useRefEffect } from '@wordpress/compose';
import { create } from '@wordpress/rich-text';
import { ENTER } from '@wordpress/keycodes';
import {
	useSelect,
	useDispatch,
	useRegistry,
	type DataRegistry,
} from '@wordpress/data';
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

/**
 * Splits a top-level list at an empty item and turns the item into a
 * default block (a paragraph) between the two halves.
 *
 * The item's inner blocks follow the new block in order: the items of a
 * nested list are lifted into the list that continues after it, and any other
 * block (a paragraph, a code block, ...) is placed between the lists.
 *
 * @param registry Data registry holding the block editor store.
 * @param clientId Client ID of the empty list item.
 */
export function exitList( registry: DataRegistry, clientId: string ) {
	const { replaceBlocks, selectionChange } =
		registry.dispatch( blockEditorStore );
	const { getBlock, getBlockRootClientId, getBlockIndex } =
		registry.select( blockEditorStore );
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
	const parentInnerBlocks = Array.isArray( topParentListBlock.innerBlocks )
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
	const after: Block[] = [];
	let items: Block[] = [];
	const flushItems = () => {
		if ( items.length ) {
			after.push( createBlock( parentName, parentAttributes, items ) );
			items = [];
		}
	};
	for ( const innerBlock of parentInnerBlocks[ blockIndex ].innerBlocks ) {
		if ( innerBlock.name === 'core/list' ) {
			items.push( ...innerBlock.innerBlocks );
		} else {
			flushItems();
			after.push( innerBlock );
		}
	}
	items.push( ...parentInnerBlocks.slice( blockIndex + 1 ) );
	flushItems();
	replaceBlocks( parentListClientId, [ head, middle, ...after ], 1 );
	// @ts-expect-error @types signature is outdated; runtime supports selectionChange( clientId ).
	selectionChange( middle.clientId );
}

export default function useEnter( props: Props ) {
	const registry = useRegistry();
	const { selectionChange, insertBlock } = useDispatch( blockEditorStore );
	const {
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
			exitList( registry, clientId );
		}

		element.addEventListener( 'keydown', onKeyDown );
		return () => {
			element.removeEventListener( 'keydown', onKeyDown );
		};
	}, [] );
}
