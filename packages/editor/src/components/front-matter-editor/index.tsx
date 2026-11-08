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
import {
	Field,
	IconButton,
	Popover,
	Select,
	Stack,
	SwitchControl,
	VisuallyHidden,
} from '@wordpress/ui';

/**
 * Internal dependencies
 */
import { useFrontMatter } from './context';
import {
	getFrontMatterValue,
	isMarpFrontMatter,
	setFrontMatterValue,
	setMarpFrontMatter,
} from '../../converter/front-matter';

// Marp's built-in themes. Descriptions are translated at render time.
function getMarpThemes(): Array< { name: string; description: string } > {
	return [
		{
			name: 'default',
			description: __(
				'Simple and clean, based on GitHub Markdown style.',
				'mark-bricks'
			),
		},
		{
			name: 'gaia',
			description: __(
				'Classic look with a colored background.',
				'mark-bricks'
			),
		},
		{
			name: 'uncover',
			description: __(
				'Minimal and modern, with centered content.',
				'mark-bricks'
			),
		},
	];
}
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
	const isMarp = isMarpFrontMatter( value );
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
					<VisuallyHidden render={ <Popover.Title /> }>
						{ __( 'Front matter settings', 'mark-bricks' ) }
					</VisuallyHidden>
					<Stack direction="column" gap="lg">
						<SwitchControl
							label={ __( 'Marp', 'mark-bricks' ) }
							description={ __(
								'Turn the document into a slide deck.',
								'mark-bricks'
							) }
							checked={ isMarp }
							onCheckedChange={ ( checked ) =>
								setFrontMatter(
									setMarpFrontMatter( value, checked )
								)
							}
						/>
						{ isMarp && (
							<MarpSettings
								value={ value }
								portalContainer={ portalContainer }
							/>
						) }
					</Stack>
				</Popover.Popup>
			</Popover.Root>
		</div>
	);
}

function MarpSettings( {
	value,
	portalContainer,
}: {
	value: string;
	portalContainer: HTMLElement | null;
} ) {
	const { setFrontMatter } = useFrontMatter();
	const theme = getFrontMatterValue( value, 'theme' ) ?? 'default';
	// Keeps a custom theme selectable alongside the built-in ones.
	const builtInThemes = getMarpThemes();
	const items: Array< {
		label: string;
		value: string;
		description?: string;
	} > = builtInThemes.map( ( { name, description } ) => ( {
		label: name,
		value: name,
		description,
	} ) );
	if ( ! builtInThemes.some( ( { name } ) => name === theme ) ) {
		items.push( { label: theme, value: theme } );
	}

	return (
		<>
			<Field.Root>
				<Field.Label>{ __( 'Theme', 'mark-bricks' ) }</Field.Label>
				<Select.Root
					items={ items }
					value={ theme }
					onValueChange={ ( next ) => {
						if ( typeof next === 'string' ) {
							setFrontMatter(
								setFrontMatterValue( value, 'theme', next )
							);
						}
					} }
				>
					<Select.Trigger />
					{ /* Portaled into the iframe document, like the popover. */ }
					<Select.Popup
						portal={
							<Select.Portal container={ portalContainer } />
						}
					>
						{ items.map( ( item ) => (
							<Select.Item
								key={ item.value }
								value={ item.value }
							>
								<Select.ItemLabel>
									{ item.label }
								</Select.ItemLabel>
								{ item.description ? (
									<Select.ItemDescription>
										{ item.description }
									</Select.ItemDescription>
								) : null }
							</Select.Item>
						) ) }
					</Select.Popup>
				</Select.Root>
			</Field.Root>
			<SwitchControl
				label={ __( 'Paginate', 'mark-bricks' ) }
				description={ __(
					'Show the page number on each slide.',
					'mark-bricks'
				) }
				checked={ getFrontMatterValue( value, 'paginate' ) === 'true' }
				onCheckedChange={ ( checked ) =>
					setFrontMatter(
						setFrontMatterValue(
							value,
							'paginate',
							checked ? 'true' : null
						)
					)
				}
			/>
		</>
	);
}
