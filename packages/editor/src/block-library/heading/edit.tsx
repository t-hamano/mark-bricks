/**
 * WordPress dependencies
 */
import {
	BlockControls,
	HeadingLevelDropdown,
	RichText,
	useBlockProps,
} from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { BlockEditProps } from '../types';
import type { BlockAttributes, HeadingLevel } from './types';

export default function Edit( {
	attributes,
	setAttributes,
	mergeBlocks,
	onReplace,
}: BlockEditProps< BlockAttributes > ) {
	const { content = '', level } = attributes;
	const safeLevel: HeadingLevel =
		level >= 1 && level <= 6 ? ( level as HeadingLevel ) : 2;
	const tagName = `h${ safeLevel }` as const;
	const blockProps = useBlockProps();

	return (
		<>
			<BlockControls group="block">
				<HeadingLevelDropdown
					value={ safeLevel }
					onChange={ ( newLevel ) =>
						setAttributes( {
							level: ( newLevel ?? 2 ) as HeadingLevel,
						} )
					}
				/>
			</BlockControls>
			<RichText
				identifier="content"
				tagName={ tagName }
				{ ...blockProps }
				value={ content }
				onChange={ ( newContent ) =>
					setAttributes( { content: newContent } )
				}
				onMerge={ mergeBlocks }
				onReplace={ onReplace }
				onRemove={ () => onReplace?.( [] ) }
				placeholder={ __( 'Heading', 'mark-bricks' ) }
			/>
		</>
	);
}
