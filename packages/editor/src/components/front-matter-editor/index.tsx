/**
 * External dependencies
 */
import { useState } from 'react';

/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import type { Block } from '@wordpress/blocks';
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { moreVertical } from '@wordpress/icons';
import { IconButton, Popover, SwitchControl } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import { useFrontMatter } from './context';
import {
	isMarpFrontMatter,
	setMarpFrontMatter,
} from '../../converter/front-matter';
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

	const [ element, setElement ] = useState< HTMLDivElement | null >( null );

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
			ref={ setElement }
			className="front-matter-editor"
			onFocus={ () => clearSelectedBlock() }
		>
			<span className="front-matter-editor__label">
				{ __( 'YAML front matter', 'mark-bricks' ) }
			</span>
			<FrontMatterSettings
				value={ value }
				portalContainer={ element?.ownerDocument.body ?? null }
			/>
			<div ref={ containerRef } />
		</div>
	);
}

function FrontMatterSettings( {
	value,
	portalContainer,
}: {
	value: string;
	portalContainer: HTMLElement | null;
} ) {
	const { setFrontMatter } = useFrontMatter();
	return (
		<div className="front-matter-editor__settings">
			<Popover.Root>
				<Popover.Trigger
					render={
						<IconButton
							icon={ moreVertical }
							label={ __(
								'Front matter settings',
								'mark-bricks'
							) }
							variant="minimal"
							tone="neutral"
							size="small"
						/>
					}
				/>
				{ /*
				 * The editor renders in an iframe, so the popup is portaled
				 * into the iframe document to be positioned next to the trigger.
				 */ }
				<Popover.Popup
					portal={ <Popover.Portal container={ portalContainer } /> }
					positioner={ <Popover.Positioner align="end" /> }
				>
					<SwitchControl
						label={ __( 'Marp', 'mark-bricks' ) }
						description={ __(
							'Turn the document into a slide deck.',
							'mark-bricks'
						) }
						checked={ isMarpFrontMatter( value ) }
						onCheckedChange={ ( checked ) =>
							setFrontMatter(
								setMarpFrontMatter( value, checked )
							)
						}
					/>
				</Popover.Popup>
			</Popover.Root>
		</div>
	);
}
