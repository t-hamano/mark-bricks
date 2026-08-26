/**
 * External dependencies
 */
import type { KeyboardEvent } from 'react';

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
	isSelected,
}: BlockEditProps< BlockAttributes > ) {
	const { summary, showContent } = attributes;

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

	return (
		<>
			<BlockControls group="block">
				<ToolbarButton
					icon={ seen }
					title={ __( 'Open by default', 'mark-bricks' ) }
					isPressed={ !! showContent }
					onClick={ () =>
						setAttributes( { showContent: ! showContent } )
					}
				/>
			</BlockControls>
			<details
				{ ...innerBlocksProps }
				open={ isSelected || hasSelectedInnerBlock || !! showContent }
			>
				<summary
					onKeyDown={ withIgnoreIMEEvents(
						( event: KeyboardEvent ) => {
							if ( event.key === 'Enter' && ! event.shiftKey ) {
								event.preventDefault();
							}
						}
					) }
					// The open state is derived, so the summary must not
					// toggle the element on its own.
					onClick={ ( event ) => event.preventDefault() }
				>
					<RichText
						identifier="summary"
						tagName="span"
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
