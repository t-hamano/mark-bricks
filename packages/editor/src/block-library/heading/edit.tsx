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
	const TagName = `h${ safeLevel }` as const;
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
			<TagName { ...blockProps } role="heading" aria-label={ undefined }>
				<RichText
					identifier="content"
					tagName="span"
					role="textbox"
					aria-label={ __( 'Heading', 'mark-bricks' ) }
					value={ content }
					onChange={ ( newContent ) =>
						setAttributes( { content: newContent } )
					}
					onMerge={ mergeBlocks }
					onReplace={ onReplace }
					onRemove={ () => onReplace?.( [] ) }
					placeholder={ __( 'Heading', 'mark-bricks' ) }
				/>
			</TagName>
		</>
	);
}
