/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import type { Block } from '@wordpress/blocks';
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { useFrontMatter } from './context';
import { useCodeMirror } from '../../block-library/hooks/use-code-mirror';

export { FrontMatterContext, useFrontMatter } from './context';
export type { FrontMatterContextValue } from './context';

export function FrontMatterEditor() {
	const { frontMatter } = useFrontMatter();
	if ( frontMatter === null ) {
		return null;
	}
	return <FrontMatterCodeMirror value={ frontMatter } />;
}

function FrontMatterCodeMirror( { value }: { value: string } ) {
	const { setFrontMatter } = useFrontMatter();
	const firstBlockClientId = useSelect(
		( select ) => select( blockEditorStore ).getBlockOrder()[ 0 ] ?? null,
		[]
	);
	const { selectBlock, clearSelectedBlock, insertBlocks } =
		useDispatch( blockEditorStore );

	const containerRef = useCodeMirror( {
		text: value,
		language: 'yaml',
		placeholder: __( 'Write YAML front matter…', 'mark-bricks' ),
		handlers: {
			previousBlockClientId: null,
			nextBlockClientId: firstBlockClientId,
			insertBlocksAfter: ( blocks ) =>
				insertBlocks( blocks as Block[], 0 ),
			selectBlock,
			onChange: setFrontMatter,
		},
	} );

	return (
		<div
			className="front-matter-editor"
			onFocus={ () => clearSelectedBlock() }
		>
			<span className="front-matter-editor__label">
				{ __( 'YAML front matter', 'mark-bricks' ) }
			</span>
			<div ref={ containerRef } />
		</div>
	);
}
