/**
 * WordPress dependencies
 */
import {
	RichText,
	useBlockProps,
	useInnerBlocksProps,
	BlockControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import type { Block } from '@wordpress/blocks';
import { ToolbarButton } from '@wordpress/components';
import { formatOutdent, formatIndent } from '@wordpress/icons';
import { useMergeRefs } from '@wordpress/compose';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { displayShortcut } from '@wordpress/keycodes';

/**
 * Internal dependencies
 */
import {
	useEnter,
	useSpace,
	useIndentListItem,
	useOutdentListItem,
	useMerge,
} from './hooks';
import taskItemIcon from './icon';
import type { BlockEditProps } from '../types';

type ListItemBlockAttributes = Block[ 'attributes' ] & {
	content: string;
	placeholder?: string;
	markdownData?: {
		checked?: boolean;
	};
};

function IndentUI( { clientId }: { clientId: string } ) {
	const indentListItem = useIndentListItem( clientId );
	const outdentListItem = useOutdentListItem();
	const { canIndent, canOutdent } = useSelect(
		( select ) => {
			const { getBlockIndex, getBlockRootClientId, getBlockName } =
				select( blockEditorStore );
			const rootId = getBlockRootClientId( clientId );
			const grandRootId = rootId ? getBlockRootClientId( rootId ) : null;
			return {
				canIndent: getBlockIndex( clientId ) > 0,
				canOutdent:
					!! grandRootId &&
					getBlockName( grandRootId ) === 'core/list-item',
			};
		},
		[ clientId ]
	);

	return (
		<>
			<ToolbarButton
				icon={ formatOutdent }
				title={ __( 'Outdent', 'mark-bricks' ) }
				shortcut={ displayShortcut.shift( 'Tab' ) }
				disabled={ ! canOutdent }
				onClick={ () => outdentListItem() }
			/>
			<ToolbarButton
				icon={ formatIndent }
				title={ __( 'Indent', 'mark-bricks' ) }
				shortcut="Tab"
				disabled={ ! canIndent }
				onClick={ () => indentListItem() }
			/>
		</>
	);
}

export default function Edit( props: BlockEditProps ) {
	const { attributes, setAttributes, clientId, mergeBlocks } =
		props as BlockEditProps< ListItemBlockAttributes >;
	const { placeholder, content, markdownData } = attributes;
	const isTaskItem = markdownData?.checked !== undefined;
	const blockProps = useBlockProps();
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		__unstableDisableDropZone: true,
		// @ts-expect-error runtime accepts false to hide appender.
		renderAppender: false,
	} );
	const useEnterRef = useEnter( { content, clientId, isTaskItem } );
	const useSpaceRef = useSpace( clientId );
	const onMerge = useMerge( clientId, mergeBlocks ?? ( () => {} ) );
	return (
		<>
			<li { ...innerBlocksProps }>
				{ isTaskItem && (
					<input
						type="checkbox"
						checked={ !! markdownData?.checked }
						onChange={ ( event ) =>
							setAttributes( {
								markdownData: {
									checked: event.target.checked,
								},
							} )
						}
						aria-label={ __( 'Toggle task', 'mark-bricks' ) }
					/>
				) }
				<RichText
					// @ts-expect-error @types mismatch: RichText ref is typed as
					// LegacyRef<'div'>, but useMergeRefs returns RefCallback<HTMLElement>.
					ref={ useMergeRefs( [ useEnterRef, useSpaceRef ] ) }
					identifier="content"
					tagName="div"
					onChange={ ( nextContent ) =>
						setAttributes( { content: nextContent } )
					}
					value={ content }
					aria-label={ __( 'List text', 'mark-bricks' ) }
					placeholder={ placeholder || __( 'List', 'mark-bricks' ) }
					onMerge={ onMerge }
				/>
				{ innerBlocksProps.children }
			</li>
			<BlockControls group="block">
				<IndentUI clientId={ clientId } />
				<ToolbarButton
					icon={ taskItemIcon }
					title={
						isTaskItem
							? __( 'Turn into a regular item', 'mark-bricks' )
							: __( 'Turn into a task item', 'mark-bricks' )
					}
					isPressed={ isTaskItem }
					onClick={ () =>
						setAttributes( {
							markdownData: isTaskItem ? {} : { checked: false },
						} )
					}
				/>
			</BlockControls>
		</>
	);
}
