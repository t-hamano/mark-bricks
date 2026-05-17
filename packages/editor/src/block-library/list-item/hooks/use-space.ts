/**
 * WordPress dependencies
 */
import { useRefEffect } from '@wordpress/compose';
import { SPACE, TAB } from '@wordpress/keycodes';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';

/**
 * Internal dependencies
 */
import useIndentListItem from './use-indent-list-item';
import useOutdentListItem from './use-outdent-list-item';

export default function useSpace( clientId: string ) {
	const { getSelectionStart, getSelectionEnd, getBlockIndex } =
		useSelect( blockEditorStore );
	const indentListItem = useIndentListItem( clientId );
	const outdentListItem = useOutdentListItem();

	return useRefEffect(
		( element: HTMLElement ) => {
			function onKeyDown( event: KeyboardEvent ) {
				const { keyCode, shiftKey, altKey, metaKey, ctrlKey } = event;

				if (
					event.defaultPrevented ||
					( keyCode !== SPACE && keyCode !== TAB ) ||
					altKey ||
					metaKey ||
					ctrlKey
				) {
					return;
				}

				const selectionStart = getSelectionStart();
				const selectionEnd = getSelectionEnd();
				if (
					selectionStart.offset === 0 &&
					selectionEnd.offset === 0
				) {
					if ( shiftKey ) {
						if ( keyCode === TAB ) {
							if ( outdentListItem() ) {
								event.preventDefault();
							}
						}
					} else if ( getBlockIndex( clientId ) !== 0 ) {
						if ( indentListItem() ) {
							event.preventDefault();
						}
					}
				}
			}

			element.addEventListener( 'keydown', onKeyDown );
			return () => {
				element.removeEventListener( 'keydown', onKeyDown );
			};
		},
		[ clientId, indentListItem ]
	);
}
