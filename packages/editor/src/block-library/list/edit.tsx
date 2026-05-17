/**
 * WordPress dependencies
 */
import {
	BlockControls,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import type { Block } from '@wordpress/blocks';
import { ToolbarButton } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { formatListBullets, formatListNumbered } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import type { BlockEditProps } from '../types';

type ListBlockAttributes = Block[ 'attributes' ] & {
	ordered: boolean;
};

const DEFAULT_BLOCK = { name: 'core/list-item' };
const TEMPLATE = [ [ 'core/list-item' ] ];

export default function Edit( props: BlockEditProps ) {
	const { attributes, setAttributes } =
		props as BlockEditProps< ListBlockAttributes >;
	const { ordered } = attributes;
	const blockProps = useBlockProps();
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		defaultBlock: DEFAULT_BLOCK,
		directInsert: true,
		templateLock: false,
		templateInsertUpdatesSelection: true,
		// @ts-expect-error @types enforces a stricter template tuple than runtime accepts.
		template: TEMPLATE,
		__experimentalCaptureToolbars: true,
	} );

	const TagName = ordered ? 'ol' : 'ul';

	return (
		<>
			<BlockControls group="block">
				<ToolbarButton
					icon={ formatListBullets }
					title={ __( 'Unordered', 'mark-bricks' ) }
					isActive={ ! ordered }
					onClick={ () => setAttributes( { ordered: false } ) }
				/>
				<ToolbarButton
					icon={ formatListNumbered }
					title={ __( 'Ordered', 'mark-bricks' ) }
					isActive={ !! ordered }
					onClick={ () => setAttributes( { ordered: true } ) }
				/>
			</BlockControls>
			<TagName { ...innerBlocksProps } />
		</>
	);
}
