/**
 * WordPress dependencies
 */
import {
	cloneBlock,
	createBlock,
	getDefaultBlockName,
	hasBlockSupport,
} from '@wordpress/blocks';
import { useRef } from '@wordpress/element';
import { useRefEffect } from '@wordpress/compose';
import { ENTER } from '@wordpress/keycodes';
import { useSelect, useDispatch, useRegistry } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';

type Props = {
	content: string;
	clientId: string;
};

/**
 * Lets an empty paragraph escape its wrapper on Enter, mirroring Gutenberg.
 *
 * When the paragraph is empty and its wrapper opts in via the
 * `__experimentalOnEnter` support (e.g. `core/quote`), pressing Enter moves
 * the paragraph out of the wrapper; otherwise the editor's default Enter
 * handling applies. Attach the returned ref to the editable element via
 * `useBlockProps`.
 *
 * @param props          Hook props.
 * @param props.content  Current paragraph content; the hook is a no-op while
 *                       it is non-empty.
 * @param props.clientId The paragraph block's client ID.
 * @return A ref callback for the editable element.
 */
export default function useEnter( props: Props ) {
	const { batch } = useRegistry();
	const {
		// @ts-expect-error @types/wordpress__block-editor is missing moveBlocksToPosition.
		moveBlocksToPosition,
		replaceBlocks,
		selectionChange,
	} = useDispatch( blockEditorStore );
	const {
		getBlockRootClientId,
		getBlockIndex,
		getBlockOrder,
		getBlockName,
		getBlock,
		canInsertBlockType,
	} = useSelect( blockEditorStore );
	const propsRef = useRef( props );
	propsRef.current = props;

	return useRefEffect( ( element: HTMLElement ) => {
		function onKeyDown( event: KeyboardEvent ) {
			if ( event.defaultPrevented || event.keyCode !== ENTER ) {
				return;
			}
			const { content, clientId } = propsRef.current;
			// A non-empty paragraph is split by the editor's default Enter
			// handling.
			if ( content.length ) {
				return;
			}
			const wrapperClientId = getBlockRootClientId( clientId );
			// A top-level paragraph has no wrapper to escape.
			if ( ! wrapperClientId ) {
				return;
			}
			// Only act inside a wrapper that opts in via `__experimentalOnEnter`.
			if (
				! hasBlockSupport(
					getBlockName( wrapperClientId ) ?? '',
					'__experimentalOnEnter',
					false
				)
			) {
				return;
			}
			const order = getBlockOrder( wrapperClientId );
			const position = order.indexOf( clientId );

			// Last child: move the paragraph out, just after the wrapper. When
			// the wrapper itself is nested, walk up until an ancestor that can
			// hold the paragraph is found.
			if ( position === order.length - 1 ) {
				let newWrapperClientId: string | null = wrapperClientId;
				while (
					newWrapperClientId &&
					! canInsertBlockType(
						getBlockName( clientId ) ?? '',
						getBlockRootClientId( newWrapperClientId ) ?? undefined
					)
				) {
					newWrapperClientId =
						getBlockRootClientId( newWrapperClientId );
				}
				if ( typeof newWrapperClientId === 'string' ) {
					event.preventDefault();
					moveBlocksToPosition(
						[ clientId ],
						wrapperClientId,
						getBlockRootClientId( newWrapperClientId ) ?? undefined,
						getBlockIndex( newWrapperClientId ) + 1
					);
				}
				return;
			}

			// Middle child: split the wrapper into head / paragraph / tail.
			const defaultBlockName = getDefaultBlockName();
			if ( ! defaultBlockName ) {
				return;
			}
			const wrapperBlockName = getBlockName( wrapperClientId ) ?? '';
			const grandparentClientId =
				getBlockRootClientId( wrapperClientId ) ?? undefined;
			if (
				! canInsertBlockType( defaultBlockName, grandparentClientId ) ||
				! canInsertBlockType( wrapperBlockName, grandparentClientId )
			) {
				return;
			}
			const wrapperBlock = getBlock( wrapperClientId );
			if ( ! wrapperBlock ) {
				return;
			}
			event.preventDefault();
			const head = cloneBlock( {
				...wrapperBlock,
				innerBlocks: wrapperBlock.innerBlocks.slice( 0, position ),
			} );
			const middle = createBlock( defaultBlockName );
			const tail = cloneBlock( {
				...wrapperBlock,
				innerBlocks: wrapperBlock.innerBlocks.slice( position + 1 ),
			} );
			batch( () => {
				replaceBlocks( wrapperClientId, [ head, middle, tail ] );
				// @ts-expect-error @types signature is outdated; runtime supports selectionChange( clientId ).
				selectionChange( middle.clientId );
			} );
		}

		element.addEventListener( 'keydown', onKeyDown );
		return () => {
			element.removeEventListener( 'keydown', onKeyDown );
		};
	}, [] );
}
