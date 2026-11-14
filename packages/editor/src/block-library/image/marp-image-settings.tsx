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
	__experimentalUnitControl as UnitControl,
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

function getBackgroundSize( options: MarpImageOptions ): BackgroundSize {
	const { size, scale } = options;
	// Marp uses the scale over a size keyword.
	if ( scale ) {
		return 'scale';
	}
	// Without a size keyword, Marp sizes a background from its width and
	// height when either one is set, as it does for `auto`.
	if ( ! size ) {
		return options.width || options.height ? 'auto' : 'cover';
	}
	if ( size === 'cover' ) {
		return 'cover';
	}
	if ( size === 'contain' || size === 'fit' ) {
		return 'contain';
	}
	return 'auto';
}

const LENGTH_UNITS = [
	'px',
	'%',
	'em',
	'ch',
	'ex',
	'cm',
	'mm',
	'in',
	'pt',
	'pc',
].map( ( unit ) => ( { value: unit, label: unit } ) );
const PERCENT_UNITS = [ { value: '%', label: '%' } ];

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
	// Kept apart from the scale value, so Scale stays selected while its
	// field is empty.
	const [ sizeMode, setSizeMode ] = useState( () =>
		getBackgroundSize( initial )
	);
	const update = ( next: Partial< MarpImageOptions > ) =>
		setOptions( ( current ) => ( { ...current, ...next } ) );

	const placement = getPlacement( options );
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
		sizeMode !== 'scale' ||
		isValidMarpPercentage( options.scale ?? '' );
	const isValid =
		isWidthValid && isHeightValid && isSplitSizeValid && isScaleValid;

	const getResult = (): MarpImageOptions => {
		const result = { ...options };
		if ( sizeMode !== 'scale' ) {
			delete result.scale;
		}
		// Without a size keyword, Marp sizes a background from its width and
		// height, so Cover is written out when either one is set.
		if (
			sizeMode === 'cover' &&
			! result.size &&
			( result.width || result.height )
		) {
			result.size = 'cover';
		}
		return result;
	};

	return (
		<Stack
			render={
				<form
					onSubmit={ ( event ) => {
						event.preventDefault();
						if ( ! isValid ) {
							return;
						}
						const result = getResult();
						// Keeps the alt text as written when nothing changed,
						// so the Markdown is not reformatted.
						if (
							JSON.stringify( result ) !==
							JSON.stringify( initial )
						) {
							onApply( serializeMarpImageAlt( result ) );
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
				<UnitControl
					__next40pxDefaultSize
					label={ __( 'Split width', 'mark-bricks' ) }
					placeholder="50"
					units={ PERCENT_UNITS }
					value={ options.splitSize ?? '' }
					onChange={ ( value ) =>
						update( { splitSize: value || undefined } )
					}
					help={ __(
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
					value={ sizeMode }
					onChange={ ( next ) => {
						const value = next as BackgroundSize;
						setSizeMode( value );
						if ( value === 'scale' ) {
							update( {
								scale: options.scale ?? initial.scale ?? '50%',
							} );
							return;
						}
						let size: string | undefined;
						if ( value === 'contain' ) {
							// Keeps `fit`, Marp's other name for `contain`.
							size = initial.size === 'fit' ? 'fit' : 'contain';
						} else if ( value === 'auto' ) {
							size = 'auto';
						} else if ( initial.size === 'cover' ) {
							size = 'cover';
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
			{ options.background && sizeMode === 'scale' && (
				<UnitControl
					__next40pxDefaultSize
					label={ __( 'Scale', 'mark-bricks' ) }
					placeholder="50"
					units={ PERCENT_UNITS }
					value={ options.scale ?? '' }
					onChange={ ( value ) =>
						update( { scale: value || undefined } )
					}
					help={ __(
						'The size relative to the original image, such as 50%.',
						'mark-bricks'
					) }
				/>
			) }
			{ /* Marp ignores the width and height of a background that covers
			 * or fits the slide. */ }
			{ ( ! options.background ||
				sizeMode === 'auto' ||
				sizeMode === 'scale' ) && (
				<Stack direction="column" gap="xs">
					<Stack direction="row" gap="sm">
						<div style={ { flex: 1 } }>
							<UnitControl
								__next40pxDefaultSize
								label={ __( 'Width', 'mark-bricks' ) }
								placeholder={ __( 'Auto', 'mark-bricks' ) }
								units={ LENGTH_UNITS }
								// `auto` has no unit, so it shows as an empty field.
								value={
									options.width === 'auto'
										? ''
										: options.width
								}
								onChange={ ( value ) =>
									update( { width: value || undefined } )
								}
							/>
						</div>
						<div style={ { flex: 1 } }>
							<UnitControl
								__next40pxDefaultSize
								label={ __( 'Height', 'mark-bricks' ) }
								placeholder={ __( 'Auto', 'mark-bricks' ) }
								units={ LENGTH_UNITS }
								value={
									options.height === 'auto'
										? ''
										: options.height
								}
								onChange={ ( value ) =>
									update( { height: value || undefined } )
								}
							/>
						</div>
					</Stack>
					<Text variant="body-sm" style={ DESCRIPTION_STYLE }>
						{ __(
							'Leave empty to size the image automatically.',
							'mark-bricks'
						) }
					</Text>
				</Stack>
			) }
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
							// Writes `horizontal` when turned off, since another
							// background of the slide may still set `vertical`.
							direction: checked
								? 'vertical'
								: initial.direction && 'horizontal',
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
