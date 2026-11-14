/**
 * External dependencies
 */
import { useEffect, useRef, useState } from 'react';

/**
 * WordPress dependencies
 */
import {
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { CheckboxControl, InputControl, Stack, Text } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import {
	MARP_THEME_CLASSES,
	findMarpDirectiveComment,
	joinMarpClasses,
	serializeMarpDirectiveComment,
	setMarpDirectiveComment,
	splitMarpClasses,
	type MarpDirectiveComment,
	type MarpDirectiveName,
} from './marp-directives';

const EMPTY: MarpDirectiveComment = {
	values: {},
	isSpot: true,
	otherLines: [],
};

function readComment( html: string ): MarpDirectiveComment {
	const found = findMarpDirectiveComment( html );
	if ( ! found ) {
		return EMPTY;
	}
	const { values, isSpot, otherLines } = found;
	return { values, isSpot, otherLines };
}

/**
 * Describes what a class of a built-in theme does.
 *
 * @param name The class name.
 * @return The description, or `undefined` for an unknown class.
 */
function getClassDescription( name: string ): string | undefined {
	switch ( name ) {
		case 'lead':
			return __( 'Centers the content of the slide.', 'mark-bricks' );
		case 'invert':
			return __( 'Inverts the colors of the slide.', 'mark-bricks' );
		case 'gaia':
			return __(
				"Switches to the theme's alternate color scheme.",
				'mark-bricks'
			);
	}
	return undefined;
}

function getPaginateDescription( value: string ): string {
	switch ( value ) {
		case 'true':
			return __( 'Shows the page number.', 'mark-bricks' );
		case 'false':
			return __( 'Hides the page number.', 'mark-bricks' );
		case 'hold':
			return __(
				'Shows the page number without counting this slide.',
				'mark-bricks'
			);
		case 'skip':
			return __(
				'Hides the page number without counting this slide.',
				'mark-bricks'
			);
	}
	return __( 'Follows the setting of the deck.', 'mark-bricks' );
}

/**
 * The form of the Marp slide settings popover. It edits the directive
 * comment of the HTML block, such as `<!-- _class: lead -->`, and leaves the
 * rest of the HTML as it is.
 *
 * Changes apply as they are made.
 *
 * @param props          Component props.
 * @param props.content  The content of the HTML block.
 * @param props.theme    The Marp theme of the deck.
 * @param props.onChange Called with the new content.
 */
export function MarpDirectiveSettings( {
	content,
	theme,
	onChange,
}: {
	content: string;
	theme: string;
	onChange: ( content: string ) => void;
} ) {
	// The content as this form last read or wrote it. A different `content`,
	// such as one typed in the block or restored by undo, resets the form.
	const lastContent = useRef( content );
	const [ initialContent, setInitialContent ] = useState( content );
	const [ initial, setInitial ] = useState( () => readComment( content ) );
	const [ comment, setComment ] = useState( initial );
	const themeClasses = MARP_THEME_CLASSES[ theme ] ?? [];
	// Kept as typed, so a space can be typed between two classes.
	const [ otherClasses, setOtherClasses ] = useState(
		() => splitMarpClasses( initial.values.class ?? '', themeClasses ).other
	);

	useEffect( () => {
		if ( content === lastContent.current ) {
			return;
		}
		lastContent.current = content;
		const parsed = readComment( content );
		setInitialContent( content );
		setInitial( parsed );
		setComment( parsed );
		setOtherClasses(
			splitMarpClasses( parsed.values.class ?? '', themeClasses ).other
		);
		// The theme classes are read again only when the content changes.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ content ] );

	const update = ( next: Partial< MarpDirectiveComment > ) => {
		const nextComment = { ...comment, ...next };
		setComment( nextComment );
		// Keeps the HTML as written when nothing changed, so it is not
		// reformatted.
		const nextContent =
			serializeMarpDirectiveComment( nextComment ) ===
			serializeMarpDirectiveComment( initial )
				? initialContent
				: setMarpDirectiveComment( initialContent, nextComment );
		if ( nextContent !== lastContent.current ) {
			lastContent.current = nextContent;
			onChange( nextContent );
		}
	};

	const setValue = ( name: MarpDirectiveName, value: string ) => {
		const values = { ...comment.values };
		if ( value ) {
			values[ name ] = value;
		} else {
			delete values[ name ];
		}
		update( { values } );
	};

	const { selected: selectedClasses } = splitMarpClasses(
		comment.values.class ?? '',
		themeClasses
	);
	const setClasses = ( selected: string[], other: string ) => {
		setOtherClasses( other );
		setValue( 'class', joinMarpClasses( selected, other, themeClasses ) );
	};
	const paginate = comment.values.paginate ?? '';

	return (
		<Stack direction="column" gap="md" style={ { width: '320px' } }>
			<ToggleGroupControl
				__next40pxDefaultSize
				isBlock
				label={ __( 'Apply to', 'mark-bricks' ) }
				help={
					comment.isSpot
						? __(
								'The settings apply to this slide only.',
								'mark-bricks'
							)
						: __(
								'The settings apply to this slide and the slides after it.',
								'mark-bricks'
							)
				}
				value={ comment.isSpot ? 'spot' : 'local' }
				onChange={ ( next ) => update( { isSpot: next === 'spot' } ) }
			>
				<ToggleGroupControlOption
					value="spot"
					label={ __( 'This slide', 'mark-bricks' ) }
				/>
				<ToggleGroupControlOption
					value="local"
					label={ __( 'Following slides', 'mark-bricks' ) }
				/>
			</ToggleGroupControl>
			{ themeClasses.length > 0 && (
				<Stack direction="column" gap="sm">
					<Text variant="heading-sm" render={ <h3 /> }>
						{ __( 'Class', 'mark-bricks' ) }
					</Text>
					{ themeClasses.map( ( name ) => (
						<CheckboxControl
							key={ name }
							label={ name }
							description={ getClassDescription( name ) }
							checked={ selectedClasses.includes( name ) }
							onCheckedChange={ ( checked ) =>
								setClasses(
									checked
										? [ ...selectedClasses, name ]
										: selectedClasses.filter(
												( item ) => item !== name
											),
									otherClasses
								)
							}
						/>
					) ) }
				</Stack>
			) }
			<InputControl
				label={
					themeClasses.length > 0
						? __( 'Other classes', 'mark-bricks' )
						: __( 'Class', 'mark-bricks' )
				}
				description={
					themeClasses.length > 0
						? sprintf(
								/* translators: %s: A theme name, such as "gaia". */
								__(
									'Classes that the %s theme does not provide, separated by spaces.',
									'mark-bricks'
								),
								theme
							)
						: __(
								'Classes of the slide, separated by spaces.',
								'mark-bricks'
							)
				}
				value={ otherClasses }
				onValueChange={ ( value ) =>
					setClasses( selectedClasses, value )
				}
			/>
			<ToggleGroupControl
				__next40pxDefaultSize
				isBlock
				isDeselectable
				label={ __( 'Page number', 'mark-bricks' ) }
				help={ getPaginateDescription( paginate ) }
				value={ paginate || undefined }
				onChange={ ( next ) =>
					setValue(
						'paginate',
						next === undefined ? '' : String( next )
					)
				}
			>
				<ToggleGroupControlOption
					value="true"
					label={ __( 'Show', 'mark-bricks' ) }
				/>
				<ToggleGroupControlOption
					value="false"
					label={ __( 'Hide', 'mark-bricks' ) }
				/>
				<ToggleGroupControlOption
					value="hold"
					label={ __( 'Hold', 'mark-bricks' ) }
				/>
				<ToggleGroupControlOption
					value="skip"
					label={ __( 'Skip', 'mark-bricks' ) }
				/>
			</ToggleGroupControl>
			<InputControl
				label={ __( 'Header', 'mark-bricks' ) }
				description={ __(
					'Text shown at the top of the slide.',
					'mark-bricks'
				) }
				value={ comment.values.header ?? '' }
				onValueChange={ ( value ) => setValue( 'header', value ) }
			/>
			<InputControl
				label={ __( 'Footer', 'mark-bricks' ) }
				description={ __(
					'Text shown at the bottom of the slide.',
					'mark-bricks'
				) }
				value={ comment.values.footer ?? '' }
				onValueChange={ ( value ) => setValue( 'footer', value ) }
			/>
			<InputControl
				label={ __( 'Background color', 'mark-bricks' ) }
				placeholder={ sprintf(
					/* translators: %s: An example value, such as "#f0f0f0". */
					__( 'e.g. %s', 'mark-bricks' ),
					'#f0f0f0'
				) }
				value={ comment.values.backgroundColor ?? '' }
				onValueChange={ ( value ) =>
					setValue( 'backgroundColor', value )
				}
			/>
			<InputControl
				label={ __( 'Text color', 'mark-bricks' ) }
				placeholder={ sprintf(
					/* translators: %s: An example value, such as "#f0f0f0". */
					__( 'e.g. %s', 'mark-bricks' ),
					'#333333'
				) }
				value={ comment.values.color ?? '' }
				onValueChange={ ( value ) => setValue( 'color', value ) }
			/>
			<InputControl
				label={ __( 'Background image', 'mark-bricks' ) }
				description={ __(
					'A CSS background image, such as a gradient.',
					'mark-bricks'
				) }
				placeholder={ sprintf(
					/* translators: %s: An example value, such as "#f0f0f0". */
					__( 'e.g. %s', 'mark-bricks' ),
					'linear-gradient(#fff, #ccc)'
				) }
				value={ comment.values.backgroundImage ?? '' }
				onValueChange={ ( value ) =>
					setValue( 'backgroundImage', value )
				}
			/>
		</Stack>
	);
}
