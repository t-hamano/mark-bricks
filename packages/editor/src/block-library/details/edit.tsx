/**
 * External dependencies
 */
import { useState } from 'react';

/**
 * WordPress dependencies
 */
import {
	BlockControls,
	RichText,
	useBlockProps,
	useInnerBlocksProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { ToolbarButton } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { seen } from '@wordpress/icons';
import { withIgnoreIMEEvents } from '@wordpress/keycodes';

/**
 * Internal dependencies
 */
import { richTextToString } from '../utils';
import type { BlockEditProps } from '../types';
import type { BlockAttributes } from './types';

const TEMPLATE = [ [ 'core/paragraph' ] ];
const DEFAULT_BLOCK = { name: 'core/paragraph' };

export default function Edit( {
	attributes,
	setAttributes,
	clientId,
}: BlockEditProps< BlockAttributes > ) {
	const { summary, showContent } = attributes;
	const [ isOpen, setIsOpen ] = useState( !! showContent );

	const hasSelectedInnerBlock = useSelect(
		( select ) =>
			select( blockEditorStore ).hasSelectedInnerBlock( clientId, true ),
		[ clientId ]
	);

	const blockProps = useBlockProps();
	const { children, ...innerBlocksProps } = useInnerBlocksProps( blockProps, {
		defaultBlock: DEFAULT_BLOCK,
		directInsert: true,
		templateLock: false,
		// @ts-expect-error @types enforces a stricter template tuple than runtime accepts.
		template: TEMPLATE,
	} );

	const toggleShowContent = () => {
		setAttributes( { showContent: ! showContent } );
		setIsOpen( ! showContent );
	};

	return (
		<>
			<BlockControls group="block">
				<ToolbarButton
					icon={ seen }
					title={ __( 'Open by default', 'mark-bricks' ) }
					isPressed={ !! showContent }
					onClick={ toggleShowContent }
				/>
			</BlockControls>
			<details
				{ ...innerBlocksProps }
				open={ isOpen || hasSelectedInnerBlock }
				onToggle={ ( event ) =>
					setIsOpen( ( event.target as HTMLDetailsElement ).open )
				}
			>
				<summary
					onKeyDown={ withIgnoreIMEEvents(
						( event: React.KeyboardEvent ) => {
							if ( event.key === 'Enter' && ! event.shiftKey ) {
								setIsOpen( ( wasOpen ) => ! wasOpen );
								event.preventDefault();
							}
						}
					) }
					onKeyUp={ ( event ) => {
						if ( event.key === ' ' ) {
							event.preventDefault();
						}
					} }
				>
					<RichText
						identifier="summary"
						placeholder={ __( 'Write summary…', 'mark-bricks' ) }
						withoutInteractiveFormatting
						value={ richTextToString( summary ) }
						onChange={ ( nextSummary: string ) =>
							setAttributes( { summary: nextSummary } )
						}
					/>
				</summary>
				{ children }
			</details>
		</>
	);
}
