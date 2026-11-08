/**
 * WordPress dependencies
 */
import { useRegistry, useDispatch, useSelect } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { create } from '@wordpress/rich-text';

export default function useMerge(
	clientId: string,
	onMerge: ( forward?: boolean ) => void
) {
	const registry = useRegistry();
	const {
		getBlockRootClientId,
		getBlockName,
		getBlockOrder,
		getBlockAttributes,
	} = useSelect( blockEditorStore );
	const { updateBlockAttributes, removeBlock, selectionChange } =
		useDispatch( blockEditorStore );

	return ( forward?: boolean ) => {
		const listItemId = getBlockRootClientId( clientId );

		// A paragraph right after the text of a list item joins the text.
		if (
			forward ||
			! listItemId ||
			getBlockName( listItemId ) !== 'core/list-item' ||
			getBlockOrder( listItemId )[ 0 ] !== clientId
		) {
			onMerge( forward );
			return;
		}

		const itemContent = getBlockAttributes( listItemId )?.content ?? '';
		const content = getBlockAttributes( clientId )?.content ?? '';
		const offset = create( { html: String( itemContent ) } ).text.length;

		registry.batch( () => {
			updateBlockAttributes( listItemId, {
				content: `${ itemContent }${ content }`,
			} );
			removeBlock( clientId, false );
			selectionChange( listItemId, 'content', offset, offset );
		} );
	};
}
