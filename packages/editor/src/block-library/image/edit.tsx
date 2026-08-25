/**
 * External dependencies
 */
import { useEffect, useState } from 'react';

/**
 * WordPress dependencies
 */
import {
	BlockControls,
	BlockIcon,
	useBlockProps,
} from '@wordpress/block-editor';
import {
	Button,
	Dropdown,
	MenuItem,
	NavigableMenu,
	Placeholder,
	Popover,
	TextControl,
	ToolbarButton,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { Notice, Stack } from '@wordpress/ui';
import { image as imageIcon, pencil } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import type { BlockEditProps } from '../types';
import type { BlockAttributes } from './types';
import { usePlatform } from '../../platform';

export default function Edit( props: BlockEditProps ) {
	const { attributes, setAttributes } =
		props as BlockEditProps< BlockAttributes >;
	const { url, alt, title } = attributes;
	const { pickImageFile, resolveImageSrc } = usePlatform();

	const [ isUrlPopoverOpen, setIsUrlPopoverOpen ] = useState( false );
	const [ urlInput, setUrlInput ] = useState( () => url || '' );
	const [ altInput, setAltInput ] = useState( () => alt || '' );
	const [ titleInput, setTitleInput ] = useState( () => title || '' );
	const [ urlPopoverAnchor, setUrlPopoverAnchor ] =
		useState< HTMLButtonElement | null >( null );
	const [ resolvedSrc, setResolvedSrc ] = useState( '' );
	const [ hasLoadError, setHasLoadError ] = useState( false );

	const blockProps = useBlockProps();

	useEffect( () => {
		setHasLoadError( false );

		if ( ! url ) {
			setResolvedSrc( '' );
			return;
		}

		let cancelled = false;
		resolveImageSrc( url ).then( ( src ) => {
			if ( ! cancelled ) {
				setResolvedSrc( src );
			}
		} );
		return () => {
			cancelled = true;
		};
	}, [ url, resolveImageSrc ] );

	const applyUrl = () => {
		const nextUrl = urlInput.trim();
		if ( ! nextUrl ) {
			return false;
		}
		setAttributes( { url: nextUrl } );
		return true;
	};

	if ( ! url ) {
		return (
			<div { ...blockProps }>
				<Placeholder
					icon={ <BlockIcon icon={ imageIcon } showColors /> }
					label={ __( 'Image', 'mark-bricks' ) }
					instructions={ __(
						'Upload an image from your device or insert from a URL.',
						'mark-bricks'
					) }
				>
					{ pickImageFile && (
						<Button
							size="compact"
							variant="secondary"
							onClick={ async () => {
								const path = await pickImageFile();
								if ( path ) {
									setAttributes( { url: path } );
								}
							} }
						>
							{ __( 'Browse local file', 'mark-bricks' ) }
						</Button>
					) }
					<Button
						size="compact"
						variant="secondary"
						onClick={ () => {
							setUrlInput( url || '' );
							setIsUrlPopoverOpen( true );
						} }
						isPressed={ isUrlPopoverOpen }
						aria-haspopup="dialog"
						ref={ setUrlPopoverAnchor }
					>
						{ __( 'Enter URL or file path', 'mark-bricks' ) }
					</Button>
					{ isUrlPopoverOpen && (
						<Popover
							anchor={ urlPopoverAnchor }
							onClose={ () => setIsUrlPopoverOpen( false ) }
							placement="bottom"
							variant="toolbar"
							offset={ 4 }
						>
							<Stack
								render={
									<form
										onSubmit={ ( event ) => {
											event.preventDefault();
											if ( applyUrl() ) {
												setIsUrlPopoverOpen( false );
											}
										} }
									/>
								}
								direction="row"
								gap="sm"
								align="flex-end"
								style={ {
									width: '280px',
									padding: 'var(--wpds-dimension-padding-sm)',
								} }
							>
								<div style={ { flex: 1 } }>
									<TextControl
										hideLabelFromVision
										label={ __(
											'Paste or type URL',
											'mark-bricks'
										) }
										placeholder={ __(
											'Paste or type URL',
											'mark-bricks'
										) }
										value={ urlInput }
										onChange={ ( value ) =>
											setUrlInput( value ?? '' )
										}
									/>
								</div>
								<Button
									size="compact"
									variant="primary"
									type="submit"
								>
									{ __( 'Apply', 'mark-bricks' ) }
								</Button>
							</Stack>
						</Popover>
					) }
				</Placeholder>
			</div>
		);
	}

	return (
		<>
			<BlockControls group="block">
				<Dropdown
					popoverProps={ { placement: 'bottom-start' } }
					onToggle={ ( willOpen ) => {
						if ( willOpen ) {
							setAltInput( alt || '' );
							setTitleInput( title || '' );
						}
					} }
					renderToggle={ ( { isOpen, onToggle } ) => (
						<ToolbarButton
							icon={ pencil }
							title={ __( 'Edit alt and title', 'mark-bricks' ) }
							onClick={ onToggle }
							aria-expanded={ isOpen }
							aria-haspopup="true"
						/>
					) }
					renderContent={ ( { onClose } ) => (
						<Stack
							render={
								<form
									onSubmit={ ( event ) => {
										event.preventDefault();
										setAttributes( {
											alt: altInput,
											title: titleInput,
										} );
										onClose();
									} }
								/>
							}
							direction="column"
							gap="sm"
							style={ {
								width: '280px',
							} }
						>
							<TextControl
								label={ __( 'Alt text', 'mark-bricks' ) }
								value={ altInput }
								onChange={ ( value ) =>
									setAltInput( value ?? '' )
								}
								placeholder={ __(
									'Enter alt text…',
									'mark-bricks'
								) }
								help={ __(
									'Describes the image for screen readers.',
									'mark-bricks'
								) }
							/>
							<TextControl
								label={ __( 'Title', 'mark-bricks' ) }
								value={ titleInput }
								onChange={ ( value ) =>
									setTitleInput( value ?? '' )
								}
								placeholder={ __(
									'Enter title…',
									'mark-bricks'
								) }
								help={ __(
									'Shown as a tooltip on hover.',
									'mark-bricks'
								) }
							/>
							<Stack justify="flex-end">
								<Button
									size="compact"
									variant="primary"
									type="submit"
								>
									{ __( 'Apply', 'mark-bricks' ) }
								</Button>
							</Stack>
						</Stack>
					) }
				/>
			</BlockControls>
			<BlockControls group="other">
				<Dropdown
					popoverProps={ { placement: 'bottom-start' } }
					onToggle={ ( willOpen ) => {
						if ( willOpen ) {
							setUrlInput( url || '' );
						}
					} }
					renderToggle={ ( { isOpen, onToggle } ) => (
						<ToolbarButton
							onClick={ onToggle }
							aria-expanded={ isOpen }
							aria-haspopup="true"
						>
							{ __( 'Replace image', 'mark-bricks' ) }
						</ToolbarButton>
					) }
					renderContent={ ( { onClose } ) => (
						<>
							<Stack
								className="wp-block-image__url"
								render={
									<form
										onSubmit={ ( event ) => {
											event.preventDefault();
											if ( applyUrl() ) {
												onClose();
											}
										} }
									/>
								}
								direction="row"
								gap="sm"
								align="flex-end"
								style={ {
									width: '280px',
									padding:
										'0 var(--wpds-dimension-padding-sm) var(--wpds-dimension-padding-sm)',
									margin: '0 calc( -1 * var(--wpds-dimension-padding-sm) ) var(--wpds-dimension-padding-sm)',
									borderBottom:
										'var(--wpds-border-width-xs) solid var(--wpds-color-background-interactive-neutral-strong-active)',
								} }
							>
								<div style={ { flex: 1 } }>
									<TextControl
										label={ __(
											'URL or file path',
											'mark-bricks'
										) }
										placeholder={ __(
											'Paste or type URL or file path',
											'mark-bricks'
										) }
										value={ urlInput }
										onChange={ ( value ) =>
											setUrlInput( value ?? '' )
										}
									/>
								</div>
								<Button
									size="compact"
									__next40pxDefaultSize
									variant="primary"
									type="submit"
								>
									{ __( 'Apply', 'mark-bricks' ) }
								</Button>
							</Stack>
							<NavigableMenu>
								{ pickImageFile && (
									<MenuItem
										onClick={ async () => {
											onClose();
											const path = await pickImageFile();
											if ( path ) {
												setAttributes( { url: path } );
											}
										} }
									>
										{ __(
											'Browse local file',
											'mark-bricks'
										) }
									</MenuItem>
								) }
								<MenuItem
									onClick={ () => {
										setAttributes( { url: '' } );
										onClose();
									} }
								>
									{ __( 'Reset', 'mark-bricks' ) }
								</MenuItem>
							</NavigableMenu>
						</>
					) }
				/>
			</BlockControls>
			<div { ...blockProps }>
				{ hasLoadError ? (
					<Notice.Root intent="error">
						<Notice.Description>
							{ __( 'Failed to load image.', 'mark-bricks' ) }
						</Notice.Description>
					</Notice.Root>
				) : (
					resolvedSrc && (
						<img
							src={ resolvedSrc }
							alt={ alt || '' }
							onError={ () => setHasLoadError( true ) }
							onLoad={ () => setHasLoadError( false ) }
						/>
					)
				) }
			</div>
		</>
	);
}
