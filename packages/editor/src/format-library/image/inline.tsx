/**
 * External dependencies
 */
import { useState } from 'react';

/**
 * WordPress dependencies
 */
import { Popover } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useAnchor } from '@wordpress/rich-text';
import { Button, InputControl, Stack } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import { usePlatform } from '../../platform';
import type { FormatEditProps } from '../types';

/**
 * Where the focus lands when the popover mounts.
 */
export type FocusOnMount = 'firstElement' | false;

/**
 * An inline image as the popover edits it.
 */
export type ImageValue = {
	url: string;
	alt: string;
	title: string;
};

type Props = {
	image: ImageValue;
	isEditing: boolean;
	focusOnMount: FocusOnMount;
	contentRef: FormatEditProps[ 'contentRef' ];
	onApply: ( image: ImageValue ) => void;
	onClose: () => void;
	onFocusOutside: () => void;
};

/**
 * The popover the inline image format opens at the caret, to insert an image
 * or edit the one that is selected.
 *
 * There is no media library to pick from, so the image is given as a URL or a
 * file path, which the host's file picker can fill in where it has one.
 *
 * @param props
 * @param props.image          The image the popover opens on.
 * @param props.isEditing      Whether an existing image is being edited.
 * @param props.focusOnMount   Where the focus lands as the popover opens.
 * @param props.contentRef     The editable element the popover anchors into.
 * @param props.onApply        Commits the edited image.
 * @param props.onClose        Dismisses the popover, returning the focus.
 * @param props.onFocusOutside Dismisses the popover, leaving the focus be.
 */
export function InlineImageUI( {
	image,
	isEditing,
	focusOnMount,
	contentRef,
	onApply,
	onClose,
	onFocusOutside,
}: Props ) {
	const { pickImageFile } = usePlatform();
	const [ url, setUrl ] = useState( image.url );
	const [ alt, setAlt ] = useState( image.alt );
	const [ title, setTitle ] = useState( image.title );

	const popoverAnchor = useAnchor( {
		editableContentElement: contentRef.current,
		settings: {
			tagName: 'img',
			className: null,
		} as unknown as Parameters< typeof useAnchor >[ 0 ][ 'settings' ],
	} );

	const trimmedUrl = url.trim();

	return (
		<Popover
			anchor={ popoverAnchor }
			animate={ false }
			onClose={ onClose }
			onFocusOutside={ onFocusOutside }
			focusOnMount={ focusOnMount }
			placement="bottom"
			offset={ 8 }
			shift
			resize={ false }
		>
			<Stack
				render={
					<form
						onSubmit={ ( event ) => {
							event.preventDefault();
							if ( trimmedUrl ) {
								onApply( { url: trimmedUrl, alt, title } );
							}
						} }
					/>
				}
				direction="column"
				gap="sm"
				style={ {
					width: '400px',
					padding: 'var(--wpds-dimension-padding-sm)',
				} }
			>
				<Stack direction="row" gap="sm" align="flex-end">
					<div style={ { flex: 1 } }>
						<InputControl
							label={ __( 'URL or file path', 'mark-bricks' ) }
							placeholder={ __(
								'Paste or type URL',
								'mark-bricks'
							) }
							value={ url }
							onValueChange={ setUrl }
						/>
					</div>
					{ pickImageFile && (
						<Button
							variant="outline"
							onClick={ async () => {
								const path = await pickImageFile();
								if ( path ) {
									setUrl( path );
								}
							} }
						>
							{ __( 'Browse local file', 'mark-bricks' ) }
						</Button>
					) }
				</Stack>
				<InputControl
					label={ __( 'Alt text', 'mark-bricks' ) }
					value={ alt }
					onValueChange={ setAlt }
					placeholder={ __( 'Enter alt text…', 'mark-bricks' ) }
					description={ __(
						'Describes the image for screen readers.',
						'mark-bricks'
					) }
				/>
				<InputControl
					label={ __( 'Title', 'mark-bricks' ) }
					value={ title }
					onValueChange={ setTitle }
					placeholder={ __( 'Enter title…', 'mark-bricks' ) }
					description={ __(
						'Shown as a tooltip on hover.',
						'mark-bricks'
					) }
				/>
				<Stack justify="flex-end">
					<Button type="submit" disabled={ ! trimmedUrl }>
						{ isEditing
							? __( 'Apply', 'mark-bricks' )
							: __( 'Insert', 'mark-bricks' ) }
					</Button>
				</Stack>
			</Stack>
		</Popover>
	);
}
