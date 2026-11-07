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
import type { BlockAttributes } from './types';
import { MATH_LANGUAGE } from '../hooks/code-languages';
import { useCodeMirror } from '../hooks/use-code-mirror';
import { MathPreview } from './preview';

export default function Edit( {
	attributes,
	setAttributes,
	clientId,
	insertBlocksAfter,
	isSelected,
}: BlockEditProps< BlockAttributes > ) {
	const { latex = '' } = attributes;
	const showEditor = isSelected || ! latex.trim();

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
		text: latex,
		language: MATH_LANGUAGE,
		placeholder: __( 'Write TeX…', 'mark-bricks' ),
		handlers: {
			previousBlockClientId,
			nextBlockClientId,
			insertBlocksAfter,
			selectBlock,
			// The MathML is only kept for WordPress, which renders the block
			// with it. Clear it with each edit, so that a block pasted into
			// WordPress does not carry a formula that no longer matches the
			// source. WordPress renders it again from the source.
			onChange: ( nextLatex ) =>
				setAttributes( { latex: nextLatex, mathML: '' } ),
		},
	} );

	const blockProps = useBlockProps();

	return (
		<div { ...blockProps }>
			{ showEditor && <div ref={ containerRef } /> }
			<MathPreview code={ latex } />
		</div>
	);
}
