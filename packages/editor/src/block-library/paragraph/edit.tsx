/**
 * WordPress dependencies
 */
import { RichText, useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import useEnter from './use-enter';
import type { BlockEditProps } from '../types';
import type { BlockAttributes } from './types';

export default function Edit( {
	attributes,
	setAttributes,
	clientId,
	mergeBlocks,
	onReplace,
	onRemove,
}: BlockEditProps< BlockAttributes > ) {
	const { content = '' } = attributes;
	const blockProps = useBlockProps( {
		ref: useEnter( { content, clientId } ),
	} );

	return (
		<RichText
			identifier="content"
			tagName="p"
			{ ...blockProps }
			value={ content }
			onChange={ ( newContent ) =>
				setAttributes( { content: newContent } )
			}
			onMerge={ mergeBlocks }
			onReplace={ onReplace }
			onRemove={ onRemove }
			placeholder={ __( 'Type / to choose a block', 'mark-bricks' ) }
			// @ts-expect-error __unstableAllowPrefixTransformations is missing from type definitions
			__unstableAllowPrefixTransformations
		/>
	);
}
