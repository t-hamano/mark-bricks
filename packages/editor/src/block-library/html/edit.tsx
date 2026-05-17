/**
 * WordPress dependencies
 */
import {
	useBlockProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { BlockEditProps } from '../types';
import { useCodeMirror } from '../hooks/use-code-mirror';
import type { BlockAttributes } from './types';

export default function Edit( {
	attributes,
	setAttributes,
	clientId,
	insertBlocksAfter,
}: BlockEditProps< BlockAttributes > ) {
	const { content } = attributes;

	const { previousBlockClientId, nextBlockClientId } = useSelect(
		( select ) => {
			const store = select( blockEditorStore );
			return {
				previousBlockClientId:
					store.getPreviousBlockClientId( clientId ),
				nextBlockClientId: store.getNextBlockClientId( clientId ),
			};
		},
		[ clientId ]
	);

	const { selectBlock } = useDispatch( blockEditorStore );

	const containerRef = useCodeMirror( {
		text: content || '',
		language: 'html',
		placeholder: __( 'Write HTML…', 'mark-bricks' ),
		handlers: {
			previousBlockClientId,
			nextBlockClientId,
			insertBlocksAfter,
			selectBlock,
			onChange: ( nextContent ) =>
				setAttributes( { content: nextContent } ),
		},
	} );

	const blockProps = useBlockProps( { ref: containerRef } );

	return <div { ...blockProps } />;
}
