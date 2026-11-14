/**
 * WordPress dependencies
 */
import {
	BlockControls,
	useBlockProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { Dropdown, ToolbarButton } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { cog } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import type { BlockEditProps } from '../types';
import { useCodeMirror } from '../hooks/use-code-mirror';
import type { BlockAttributes } from './types';
import { useFrontMatter } from '../../components/front-matter-editor/context';
import {
	getFrontMatterValue,
	isMarpFrontMatter,
} from '../../converter/front-matter';
import { MarpDirectiveSettings } from './marp-directive-settings';

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

	// In a Marp slide deck, an HTML comment sets directives of the slide,
	// such as `<!-- _class: lead -->`, so they can be set from a form.
	const { frontMatter } = useFrontMatter();
	const isMarp = isMarpFrontMatter( frontMatter );
	const theme = getFrontMatterValue( frontMatter, 'theme' ) ?? 'default';

	return (
		<>
			{ isMarp && (
				<BlockControls group="block">
					<Dropdown
						popoverProps={ { placement: 'bottom-start' } }
						renderToggle={ ( { isOpen, onToggle } ) => (
							<ToolbarButton
								icon={ cog }
								title={ __(
									'Marp slide settings',
									'mark-bricks'
								) }
								onClick={ onToggle }
								aria-expanded={ isOpen }
								aria-haspopup="true"
							/>
						) }
						renderContent={ () => (
							<MarpDirectiveSettings
								content={ content || '' }
								theme={ theme }
								onChange={ ( next ) =>
									setAttributes( { content: next } )
								}
							/>
						) }
					/>
				</BlockControls>
			) }
			<div { ...blockProps } />
		</>
	);
}
