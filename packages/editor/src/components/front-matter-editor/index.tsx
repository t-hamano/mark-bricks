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
import { createInterpolateElement } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { moreVertical } from '@wordpress/icons';
import {
	Field,
	IconButton,
	InputControl,
	Link,
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
import { useCodeMirror } from '../../block-library/hooks/use-code-mirror';
import { usePlatform } from '../../platform';

const MARP_DIRECTIVES_URL = 'https://marpit.marp.app/directives';

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
	const { openUrl } = usePlatform();
	const setValue = ( key: string, next: string | null ) =>
		setFrontMatter( setFrontMatterValue( value, key, next ) );

	const theme = getFrontMatterValue( value, 'theme' ) ?? 'default';
	// Marp's built-in themes.
	const themes: Array< {
		label: string;
		value: string;
		description?: string;
	} > = [
		{
			label: 'default',
			value: 'default',
			description: __(
				'Simple and clean, based on GitHub Markdown style.',
				'mark-bricks'
			),
		},
		{
			label: 'gaia',
			value: 'gaia',
			description: __(
				'Classic look with a colored background.',
				'mark-bricks'
			),
		},
		{
			label: 'uncover',
			value: 'uncover',
			description: __(
				'Minimal and modern, with centered content.',
				'mark-bricks'
			),
		},
	];
	// Keeps a theme written by hand selectable alongside the built-in ones.
	if ( ! themes.some( ( item ) => item.value === theme ) ) {
		themes.push( { label: theme, value: theme } );
	}

	const size = getFrontMatterValue( value, 'size' ) ?? '16:9';
	// The sizes that Marp's built-in themes provide.
	const sizes = [ '16:9', '4:3' ];
	if ( ! sizes.includes( size ) ) {
		sizes.push( size );
	}

	return (
		<>
			<Field.Root>
				<Field.Label>{ __( 'Theme', 'mark-bricks' ) }</Field.Label>
				<Select.Root
					items={ themes }
					value={ theme }
					onValueChange={ ( next ) => {
						if ( typeof next === 'string' ) {
							setValue( 'theme', next );
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
						{ themes.map( ( item ) => (
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
			<Field.Root>
				<Field.Label>{ __( 'Size', 'mark-bricks' ) }</Field.Label>
				<Select.Root
					value={ size }
					onValueChange={ ( next ) => {
						if ( typeof next === 'string' ) {
							setValue( 'size', next );
						}
					} }
				>
					<Select.Trigger />
					<Select.Popup
						portal={
							<Select.Portal container={ portalContainer } />
						}
					>
						{ sizes.map( ( item ) => (
							<Select.Item key={ item } value={ item }>
								<Select.ItemLabel>{ item }</Select.ItemLabel>
							</Select.Item>
						) ) }
					</Select.Popup>
				</Select.Root>
				<Field.Description>
					{ __( 'The aspect ratio of the slides.', 'mark-bricks' ) }
				</Field.Description>
			</Field.Root>
			<InputControl
				label={ __( 'Header', 'mark-bricks' ) }
				description={ __(
					'Text shown at the top of each slide.',
					'mark-bricks'
				) }
				value={ getFrontMatterValue( value, 'header' ) ?? '' }
				onChange={ ( event ) =>
					setValue( 'header', event.target.value || null )
				}
			/>
			<InputControl
				label={ __( 'Footer', 'mark-bricks' ) }
				description={ __(
					'Text shown at the bottom of each slide.',
					'mark-bricks'
				) }
				value={ getFrontMatterValue( value, 'footer' ) ?? '' }
				onChange={ ( event ) =>
					setValue( 'footer', event.target.value || null )
				}
			/>
			<SwitchControl
				label={ __( 'Paginate', 'mark-bricks' ) }
				description={ __(
					'Show the page number on each slide.',
					'mark-bricks'
				) }
				checked={ getFrontMatterValue( value, 'paginate' ) === 'true' }
				onCheckedChange={ ( checked ) =>
					setValue( 'paginate', checked ? 'true' : null )
				}
			/>
			<p className="front-matter-editor__settings-help">
				{ createInterpolateElement(
					__(
						'See the <a>Marp documentation</a> for other settings.',
						'mark-bricks'
					),
					{
						a: (
							<Link
								href={ MARP_DIRECTIVES_URL }
								openInNewTab
								onClick={
									openUrl
										? ( event ) => {
												event.preventDefault();
												openUrl( MARP_DIRECTIVES_URL );
											}
										: undefined
								}
							/>
						),
					}
				) }
			</p>
		</>
	);
}
