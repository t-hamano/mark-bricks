/**
 * External dependencies
 */
import { useState } from 'react';

/**
 * WordPress dependencies
 */
import {
	DropdownMenu,
	MenuGroup,
	MenuItem,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { closeSmall, plus } from '@wordpress/icons';
import {
	Button,
	IconButton,
	InputControl,
	Stack,
	SwitchControl,
	Text,
} from '@wordpress/ui';

/**
 * Internal dependencies
 */
import {
	MARP_FILTERS,
	MARP_FILTER_DEFAULTS,
	isValidMarpLength,
	isValidMarpPercentage,
	parseMarpImageAlt,
	serializeMarpImageAlt,
	type MarpImageOptions,
} from './marp-image-options';

// Matches the description below a field.
const DESCRIPTION_STYLE = {
	color: 'var(--wpds-color-foreground-content-neutral-weak, #707070)',
};

type Placement = 'inline' | 'background' | 'left' | 'right';
type BackgroundSize = 'cover' | 'contain' | 'auto' | 'scale';

function getPlacement( options: MarpImageOptions ): Placement {
	if ( ! options.background ) {
		return 'inline';
	}
	return options.split ?? 'background';
}

function getBackgroundSize( size: string | undefined ): BackgroundSize {
	if ( ! size || size === 'cover' ) {
		return 'cover';
	}
	if ( size === 'contain' || size === 'fit' ) {
		return 'contain';
	}
	if ( size === 'auto' ) {
		return 'auto';
	}
	return 'scale';
}

/**
 * The form of the Marp image settings popover. It edits the Marp keywords of
 * the alt text and leaves the other words as they are.
 *
 * @param props         Component props.
 * @param props.alt     The alt text of the image.
 * @param props.onApply Called with the new alt text.
 * @param props.onClose Closes the popover.
 */
export function MarpImageSettings( {
	alt,
	onApply,
	onClose,
}: {
	alt: string;
	onApply: ( alt: string ) => void;
	onClose: () => void;
} ) {
	const [ initial ] = useState( () => parseMarpImageAlt( alt ) );
	const [ options, setOptions ] = useState( initial );
	const update = ( next: Partial< MarpImageOptions > ) =>
		setOptions( ( current ) => ( { ...current, ...next } ) );

	const placement = getPlacement( options );
	const backgroundSize = getBackgroundSize( options.size );
	const isSplit = placement === 'left' || placement === 'right';

	const isWidthValid = ! options.width || isValidMarpLength( options.width );
	const isHeightValid =
		! options.height || isValidMarpLength( options.height );
	const isSplitSizeValid =
		! isSplit ||
		! options.splitSize ||
		isValidMarpPercentage( options.splitSize );
	const isScaleValid =
		! options.background ||
		backgroundSize !== 'scale' ||
		isValidMarpPercentage( options.size ?? '' );
	const isValid =
		isWidthValid && isHeightValid && isSplitSizeValid && isScaleValid;

	const lengthDescription = __(
		'Such as 200px, 50% or auto.',
		'mark-bricks'
	);

	return (
		<Stack
			render={
				<form
					onSubmit={ ( event ) => {
						event.preventDefault();
						if ( ! isValid ) {
							return;
						}
						// Keeps the alt text as written when nothing changed,
						// so the Markdown is not reformatted.
						if (
							JSON.stringify( options ) !==
							JSON.stringify( initial )
						) {
							onApply( serializeMarpImageAlt( options ) );
						}
						onClose();
					} }
				/>
			}
			direction="column"
			gap="md"
			style={ { width: '400px' } }
		>
			<ToggleGroupControl
				__next40pxDefaultSize
				isBlock
				label={ __( 'Placement', 'mark-bricks' ) }
				help={
					placement === 'inline'
						? __(
								'The image sits in the slide content.',
								'mark-bricks'
							)
						: __(
								'The image fills the slide, or one side of it, behind the content.',
								'mark-bricks'
							)
				}
				value={ placement }
				onChange={ ( next ) => {
					const value = next as Placement;
					update( {
						background: value !== 'inline',
						split:
							value === 'left' || value === 'right'
								? value
								: undefined,
					} );
				} }
			>
				<ToggleGroupControlOption
					value="inline"
					label={ __( 'Inline', 'mark-bricks' ) }
				/>
				<ToggleGroupControlOption
					value="background"
					label={ __( 'Background', 'mark-bricks' ) }
				/>
				<ToggleGroupControlOption
					value="left"
					label={ __( 'Left', 'mark-bricks' ) }
				/>
				<ToggleGroupControlOption
					value="right"
					label={ __( 'Right', 'mark-bricks' ) }
				/>
			</ToggleGroupControl>
			{ isSplit && (
				<InputControl
					label={ __( 'Split width', 'mark-bricks' ) }
					placeholder="50%"
					value={ options.splitSize ?? '' }
					onValueChange={ ( value ) =>
						update( { splitSize: value.trim() || undefined } )
					}
					aria-invalid={ ! isSplitSizeValid }
					description={ __(
						'The share of the slide the image takes, such as 40%.',
						'mark-bricks'
					) }
				/>
			) }
			{ options.background && (
				<ToggleGroupControl
					__next40pxDefaultSize
					isBlock
					label={ __( 'Background size', 'mark-bricks' ) }
					value={ backgroundSize }
					onChange={ ( next ) => {
						const value = next as BackgroundSize;
						let size: string | undefined;
						if ( value === 'contain' ) {
							// Keeps `fit`, Marp's other name for `contain`.
							size = options.size === 'fit' ? 'fit' : 'contain';
						} else if ( value === 'auto' ) {
							size = 'auto';
						} else if ( value === 'scale' ) {
							size =
								initial.size &&
								isValidMarpPercentage( initial.size )
									? initial.size
									: '50%';
						}
						update( { size } );
					} }
				>
					<ToggleGroupControlOption
						value="cover"
						label={ __( 'Cover', 'mark-bricks' ) }
					/>
					<ToggleGroupControlOption
						value="contain"
						label={ __( 'Contain', 'mark-bricks' ) }
					/>
					<ToggleGroupControlOption
						value="auto"
						label={ __( 'Original', 'mark-bricks' ) }
					/>
					<ToggleGroupControlOption
						value="scale"
						label={ __( 'Scale', 'mark-bricks' ) }
					/>
				</ToggleGroupControl>
			) }
			{ options.background && backgroundSize === 'scale' && (
				<InputControl
					label={ __( 'Scale', 'mark-bricks' ) }
					placeholder="50%"
					value={ options.size ?? '' }
					onValueChange={ ( value ) =>
						update( { size: value.trim() } )
					}
					aria-invalid={ ! isScaleValid }
					description={ __(
						'The size relative to the original image, such as 50%.',
						'mark-bricks'
					) }
				/>
			) }
			<Stack direction="column" gap="xs">
				<Stack direction="row" gap="sm">
					<div style={ { flex: 1 } }>
						<InputControl
							label={ __( 'Width', 'mark-bricks' ) }
							placeholder="auto"
							value={ options.width ?? '' }
							onValueChange={ ( value ) =>
								update( { width: value.trim() || undefined } )
							}
							aria-invalid={ ! isWidthValid }
						/>
					</div>
					<div style={ { flex: 1 } }>
						<InputControl
							label={ __( 'Height', 'mark-bricks' ) }
							placeholder="auto"
							value={ options.height ?? '' }
							onValueChange={ ( value ) =>
								update( { height: value.trim() || undefined } )
							}
							aria-invalid={ ! isHeightValid }
						/>
					</div>
				</Stack>
				<Text variant="body-sm" style={ DESCRIPTION_STYLE }>
					{ lengthDescription }
				</Text>
			</Stack>
			{ options.background && (
				<SwitchControl
					label={ __( 'Stack vertically', 'mark-bricks' ) }
					description={ __(
						'Lines up the background images of the slide from top to bottom instead of side by side.',
						'mark-bricks'
					) }
					checked={ options.direction === 'vertical' }
					onCheckedChange={ ( checked ) =>
						update( {
							direction: checked ? 'vertical' : undefined,
						} )
					}
				/>
			) }
			<Stack direction="column" gap="sm">
				<Stack direction="row" justify="space-between" align="center">
					<Text variant="heading-sm" render={ <h3 /> }>
						{ __( 'Filters', 'mark-bricks' ) }
					</Text>
					<DropdownMenu
						icon={ plus }
						label={ __( 'Add filter', 'mark-bricks' ) }
						toggleProps={ { size: 'compact' } }
					>
						{ ( { onClose: closeMenu } ) => (
							<MenuGroup>
								{ MARP_FILTERS.filter(
									( name ) =>
										! options.filters.some(
											( filter ) => filter.name === name
										)
								).map( ( name ) => (
									<MenuItem
										key={ name }
										onClick={ () => {
											update( {
												filters: [
													...options.filters,
													{ name, value: '' },
												],
											} );
											closeMenu();
										} }
									>
										{ name }
									</MenuItem>
								) ) }
							</MenuGroup>
						) }
					</DropdownMenu>
				</Stack>
				{ options.filters.length === 0 && (
					<Text variant="body-sm" style={ DESCRIPTION_STYLE }>
						{ __( 'No filters.', 'mark-bricks' ) }
					</Text>
				) }
				{ options.filters.map( ( filter, index ) => (
					<Stack
						key={ index }
						direction="row"
						gap="sm"
						align="center"
					>
						<div style={ { flex: 1 } }>
							<InputControl
								label={ filter.name }
								placeholder={
									MARP_FILTER_DEFAULTS[ filter.name ]
								}
								value={ filter.value }
								onValueChange={ ( value ) =>
									update( {
										filters: options.filters.map(
											( item, i ) =>
												i === index
													? { ...item, value }
													: item
										),
									} )
								}
							/>
						</div>
						<IconButton
							icon={ closeSmall }
							label={ __( 'Remove filter', 'mark-bricks' ) }
							variant="minimal"
							tone="neutral"
							size="compact"
							style={ { alignSelf: 'flex-end' } }
							onClick={ () =>
								update( {
									filters: options.filters.filter(
										( _, i ) => i !== index
									),
								} )
							}
						/>
					</Stack>
				) ) }
			</Stack>
			<Stack justify="flex-end">
				<Button type="submit" disabled={ ! isValid }>
					{ __( 'Apply', 'mark-bricks' ) }
				</Button>
			</Stack>
		</Stack>
	);
}
