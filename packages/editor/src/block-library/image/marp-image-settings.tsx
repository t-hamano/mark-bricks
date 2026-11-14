/**
 * External dependencies
 */
import { useEffect, useRef, useState } from 'react';

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
import { __, sprintf } from '@wordpress/i18n';
import { closeSmall, plus } from '@wordpress/icons';
import {
	IconButton,
	InputControl,
	Notice,
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
	getKeywordsInText,
	isValidMarpLength,
	isValidMarpPercentage,
	parseMarpImageAlt,
	serializeMarpImageAlt,
	type MarpFilterName,
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
// Marp ignores a percentage width or height on an inline image.
const INLINE_LENGTH_UNITS = LENGTH_UNITS.filter(
	( unit ) => unit.value !== '%'
);
const PERCENT_UNITS = [ { value: '%', label: '%' } ];

/**
 * Describes the values a CSS filter takes, as Marp passes the value to it.
 *
 * @param name The filter name.
 * @return The description.
 */
function getFilterDescription( name: MarpFilterName ): string {
	switch ( name ) {
		case 'blur':
			return __( 'A length of 0 or more, such as 10px.', 'mark-bricks' );
		case 'brightness':
		case 'contrast':
		case 'saturate':
			return __(
				'A number or percentage of 0 or more. 1 keeps the original.',
				'mark-bricks'
			);
		case 'grayscale':
		case 'invert':
		case 'opacity':
		case 'sepia':
			return __(
				'A number from 0 to 1, or a percentage up to 100%.',
				'mark-bricks'
			);
		case 'hue-rotate':
			return __( 'An angle, such as 90deg or 0.5turn.', 'mark-bricks' );
		case 'drop-shadow':
			return __(
				'The x and y offsets, then an optional blur and color, separated by commas.',
				'mark-bricks'
			);
	}
}

/**
 * Checks the values of the form and builds the keywords it writes.
 *
 * @param options  The values of the form.
 * @param sizeMode The selected background size.
 * @return Whether the values are valid, and the keywords to write.
 */
function getFormState(
	options: MarpImageOptions,
	sizeMode: BackgroundSize
): { isValid: boolean; result: MarpImageOptions } {
	const isSplit = !! options.background && !! options.split;
	const isValid =
		( ! options.width || isValidMarpLength( options.width ) ) &&
		( ! options.height || isValidMarpLength( options.height ) ) &&
		( ! isSplit ||
			! options.splitSize ||
			isValidMarpPercentage( options.splitSize ) ) &&
		( ! options.background ||
			sizeMode !== 'scale' ||
			isValidMarpPercentage( options.scale ?? '' ) );

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
	return { isValid, result };
}

/**
 * The form of the Marp image settings popover. It edits the Marp keywords of
 * the alt text and leaves the other words as they are.
 *
 * Changes apply as they are made.
 *
 * @param props          Component props.
 * @param props.alt      The alt text of the image.
 * @param props.onChange Called with the new alt text.
 */
export function MarpImageSettings( {
	alt,
	onChange,
}: {
	alt: string;
	onChange: ( alt: string ) => void;
} ) {
	// The alt text as this form last read or wrote it. A different `alt`,
	// such as one restored by undo, resets the form.
	const lastAlt = useRef( alt );
	const [ initialAlt, setInitialAlt ] = useState( alt );
	const [ initial, setInitial ] = useState( () => parseMarpImageAlt( alt ) );
	const [ options, setOptions ] = useState( initial );
	// Kept apart from the scale value, so Scale stays selected while its
	// field is empty.
	const [ sizeMode, setSizeMode ] = useState( () =>
		getBackgroundSize( initial )
	);

	useEffect( () => {
		if ( alt === lastAlt.current ) {
			return;
		}
		lastAlt.current = alt;
		const parsed = parseMarpImageAlt( alt );
		setInitialAlt( alt );
		setInitial( parsed );
		setOptions( parsed );
		setSizeMode( getBackgroundSize( parsed ) );
	}, [ alt ] );

	const { result } = getFormState( options, sizeMode );

	// Applies a change as it is made. The alt text is kept as written when
	// nothing changed, so the Markdown is not reformatted, and an invalid
	// value is not applied until it is fixed.
	const update = (
		next: Partial< MarpImageOptions >,
		nextSizeMode: BackgroundSize = sizeMode
	) => {
		const nextOptions = { ...options, ...next };
		setOptions( nextOptions );
		setSizeMode( nextSizeMode );
		const state = getFormState( nextOptions, nextSizeMode );
		if ( ! state.isValid ) {
			return;
		}
		const nextAlt =
			JSON.stringify( state.result ) === JSON.stringify( initial )
				? initialAlt
				: serializeMarpImageAlt( state.result );
		if ( nextAlt !== lastAlt.current ) {
			lastAlt.current = nextAlt;
			onChange( nextAlt );
		}
	};

	const placement = getPlacement( options );
	const isSplit = placement === 'left' || placement === 'right';
	const lengthUnits = options.background ? LENGTH_UNITS : INLINE_LENGTH_UNITS;
	const keywordWords = getKeywordsInText( result );
	// Each filter can be added once.
	const availableFilters = MARP_FILTERS.filter(
		( name ) => ! options.filters.some( ( filter ) => filter.name === name )
	);

	return (
		<Stack direction="column" gap="md" style={ { width: '400px' } }>
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
						if ( value === 'scale' ) {
							update(
								{
									scale:
										options.scale ?? initial.scale ?? '50%',
								},
								value
							);
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
						update( { size }, value );
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
								units={ lengthUnits }
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
								units={ lengthUnits }
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
			<Stack direction="column" gap="md">
				<Stack direction="row" justify="space-between" align="center">
					<Text variant="heading-sm" render={ <h3 /> }>
						{ __( 'Filters', 'mark-bricks' ) }
					</Text>
					<DropdownMenu
						icon={ plus }
						label={ __( 'Add filter', 'mark-bricks' ) }
						toggleProps={ {
							size: 'compact',
							// Stays focusable, so its label can still be read.
							disabled: availableFilters.length === 0,
							accessibleWhenDisabled: true,
						} }
					>
						{ ( { onClose: closeMenu } ) => (
							<MenuGroup>
								{ availableFilters.map( ( name ) => (
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
					<InputControl
						key={ index }
						label={ filter.name }
						placeholder={ sprintf(
							/* translators: %s: An example value, such as "1.5". */
							__( 'e.g. %s', 'mark-bricks' ),
							MARP_FILTER_DEFAULTS[ filter.name ]
						) }
						description={ getFilterDescription( filter.name ) }
						value={ filter.value }
						onValueChange={ ( value ) =>
							update( {
								filters: options.filters.map( ( item, i ) =>
									i === index ? { ...item, value } : item
								),
							} )
						}
						suffix={
							<IconButton
								icon={ closeSmall }
								label={ __( 'Remove filter', 'mark-bricks' ) }
								variant="minimal"
								tone="neutral"
								size="small"
								onClick={ () =>
									update( {
										filters: options.filters.filter(
											( _, i ) => i !== index
										),
									} )
								}
							/>
						}
					/>
				) ) }
			</Stack>
			{ keywordWords.length > 0 && (
				<Notice.Root intent="warning">
					<Notice.Description>
						{ sprintf(
							/* translators: %s: Words of the alt text, such as "right". */
							__(
								'Marp reads these words as settings: %s',
								'mark-bricks'
							),
							keywordWords.join( ', ' )
						) }
					</Notice.Description>
				</Notice.Root>
			) }
		</Stack>
	);
}
