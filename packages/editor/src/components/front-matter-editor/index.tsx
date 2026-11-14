/**
 * External dependencies
 */
import { useState } from 'react';

/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import type { Block } from '@wordpress/blocks';
import { ColorIndicator } from '@wordpress/components';
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
import {
	MARP_COLOR_SCHEMES,
	MARP_FONT_STYLES,
	getMarpColorScheme,
	getMarpFontStyle,
	isMarpColorSchemeOverridden,
	setMarpColorScheme,
	setMarpFontStyle,
	supportsMarpColorScheme,
	type MarpColorScheme,
} from '../../marp-style-presets';
import { useCodeMirror } from '../../block-library/hooks/use-code-mirror';
import { usePlatform } from '../../platform';

const MARP_DIRECTIVES_URL = 'https://marpit.marp.app/directives';

// The color scheme option that leaves the theme's own colors.
const THEME_COLORS = 'theme';

// The font option that leaves the theme's own font.
const THEME_FONT = 'theme';

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

	const colorScheme = getMarpColorScheme( value );

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
						if ( typeof next !== 'string' ) {
							return;
						}
						const nextValue = setFrontMatterValue(
							value,
							'theme',
							next
						);
						// Rewrites the color scheme for the variables the new
						// theme reads its colors from.
						setFrontMatter(
							colorScheme
								? setMarpColorScheme(
										nextValue,
										next,
										supportsMarpColorScheme( next )
											? colorScheme.id
											: null
									)
								: nextValue
						);
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
			{ supportsMarpColorScheme( theme ) && (
				<ColorSchemeField
					value={ value }
					theme={ theme }
					colorScheme={ colorScheme }
					portalContainer={ portalContainer }
				/>
			) }
			<FontStyleField
				value={ value }
				portalContainer={ portalContainer }
			/>
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

function ColorSchemeField( {
	value,
	theme,
	colorScheme,
	portalContainer,
}: {
	value: string;
	theme: string;
	colorScheme: MarpColorScheme | null;
	portalContainer: HTMLElement | null;
} ) {
	const { setFrontMatter } = useFrontMatter();
	const items = [
		{ label: __( 'Theme colors', 'mark-bricks' ), value: THEME_COLORS },
		...MARP_COLOR_SCHEMES.map( ( scheme ) => ( {
			label: scheme.label,
			value: scheme.id,
		} ) ),
	];
	const selected = colorScheme?.id ?? THEME_COLORS;
	const isOverridden =
		colorScheme !== null && isMarpColorSchemeOverridden( value, theme );

	return (
		<Field.Root>
			<Field.Label>{ __( 'Color scheme', 'mark-bricks' ) }</Field.Label>
			<Select.Root
				items={ items }
				value={ selected }
				onValueChange={ ( next ) => {
					if ( typeof next === 'string' ) {
						setFrontMatter(
							setMarpColorScheme(
								value,
								theme,
								next === THEME_COLORS ? null : next
							)
						);
					}
				} }
			>
				<Select.Trigger>
					<ColorSchemeLabel
						scheme={ colorScheme }
						label={
							items.find( ( item ) => item.value === selected )
								?.label ?? ''
						}
					/>
				</Select.Trigger>
				<Select.Popup
					portal={ <Select.Portal container={ portalContainer } /> }
				>
					{ items.map( ( item ) => (
						<Select.Item
							key={ item.value }
							value={ item.value }
							label={ item.label }
						>
							<Select.ItemLabel>
								<ColorSchemeLabel
									scheme={
										MARP_COLOR_SCHEMES.find(
											( scheme ) =>
												scheme.id === item.value
										) ?? null
									}
									label={ item.label }
								/>
							</Select.ItemLabel>
						</Select.Item>
					) ) }
				</Select.Popup>
			</Select.Root>
			<Field.Description>
				{ isOverridden
					? __(
							'Your own CSS in style overrides some of these colors.',
							'mark-bricks'
						)
					: __(
							'Recolor the theme. The colors are written to style.',
							'mark-bricks'
						) }
			</Field.Description>
		</Field.Root>
	);
}

function FontStyleField( {
	value,
	portalContainer,
}: {
	value: string;
	portalContainer: HTMLElement | null;
} ) {
	const { setFrontMatter } = useFrontMatter();
	const labels: Record< string, string > = {
		'sans-serif': __( 'Sans-serif', 'mark-bricks' ),
		serif: __( 'Serif', 'mark-bricks' ),
		monospace: __( 'Monospace', 'mark-bricks' ),
	};
	const items = [
		{
			label: __( 'Theme font', 'mark-bricks' ),
			value: THEME_FONT,
			fontFamily: undefined as string | undefined,
		},
		...MARP_FONT_STYLES.map( ( font ) => ( {
			label: labels[ font.id ] ?? font.label,
			value: font.id,
			fontFamily: font.fontFamily as string | undefined,
		} ) ),
	];
	const selected =
		items.find(
			( item ) => item.value === getMarpFontStyle( value )?.id
		) ?? items[ 0 ];

	return (
		<Field.Root>
			<Field.Label>{ __( 'Font', 'mark-bricks' ) }</Field.Label>
			<Select.Root
				items={ items }
				value={ selected.value }
				onValueChange={ ( next ) => {
					if ( typeof next === 'string' ) {
						setFrontMatter(
							setMarpFontStyle(
								value,
								next === THEME_FONT ? null : next
							)
						);
					}
				} }
			>
				<Select.Trigger>
					<span style={ { fontFamily: selected.fontFamily } }>
						{ selected.label }
					</span>
				</Select.Trigger>
				<Select.Popup
					portal={ <Select.Portal container={ portalContainer } /> }
				>
					{ items.map( ( item ) => (
						<Select.Item
							key={ item.value }
							value={ item.value }
							label={ item.label }
						>
							<Select.ItemLabel>
								<span style={ { fontFamily: item.fontFamily } }>
									{ item.label }
								</span>
							</Select.ItemLabel>
						</Select.Item>
					) ) }
				</Select.Popup>
			</Select.Root>
			<Field.Description>
				{ __(
					'The font style of the slides. Each device shows its own font of that style.',
					'mark-bricks'
				) }
			</Field.Description>
		</Field.Root>
	);
}

function ColorSchemeLabel( {
	scheme,
	label,
}: {
	scheme: MarpColorScheme | null;
	label: string;
} ) {
	return (
		<span className="front-matter-editor__color-scheme">
			{ scheme && (
				<span
					className="front-matter-editor__color-scheme-swatches"
					aria-hidden="true"
				>
					{ [
						scheme.colors.background,
						scheme.colors.foreground,
						scheme.colors.accent,
					].map( ( color, index ) => (
						<ColorIndicator key={ index } colorValue={ color } />
					) ) }
				</span>
			) }
			{ label }
		</span>
	);
}
