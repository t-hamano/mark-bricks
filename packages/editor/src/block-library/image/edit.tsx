/**
 * External dependencies
 */
import { useEffect, useState } from 'react';

/**
 * WordPress dependencies
 */
import { BlockControls, useBlockProps } from '@wordpress/block-editor';
import { Dropdown, ToolbarButton } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { Button, InputControl, Notice, Stack } from '@wordpress/ui';
import { image as imageIcon, pencil } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import type { BlockEditProps } from '../types';
import type { BlockAttributes } from './types';
import { BlockPlaceholder } from '../../components/block-placeholder';
import { useImageNotice, usePlatform } from '../../platform';

export default function Edit( props: BlockEditProps ) {
	const { attributes, setAttributes } =
		props as BlockEditProps< BlockAttributes >;
	const { url, alt, title } = attributes;
	const { pickImageFile, resolveImageSrc } = usePlatform();

	const [ urlInput, setUrlInput ] = useState( () => url || '' );
	const [ altInput, setAltInput ] = useState( () => alt || '' );
	const [ titleInput, setTitleInput ] = useState( () => title || '' );
	const imageNotice = useImageNotice( urlInput );
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
				<BlockPlaceholder
					icon={ imageIcon }
					label={ __( 'Image', 'mark-bricks' ) }
					instructions={ __(
						'Upload an image from your device or insert from a URL.',
						'mark-bricks'
					) }
				>
					<Stack
						render={
							<form
								onSubmit={ ( event ) => {
									event.preventDefault();
									applyUrl();
								} }
							/>
						}
						direction="row"
						gap="sm"
						align="center"
						wrap="wrap"
						style={ { width: '100%' } }
					>
						<div style={ { flex: '1 1 240px' } }>
							<InputControl
								hideLabelFromVision
								label={ __(
									'URL or file path',
									'mark-bricks'
								) }
								placeholder={ __(
									'Paste or type URL or file path',
									'mark-bricks'
								) }
								value={ urlInput }
								onValueChange={ setUrlInput }
							/>
						</div>
						{ pickImageFile && (
							<Button
								variant="outline"
								onClick={ async () => {
									const path = await pickImageFile();
									if ( path ) {
										setUrlInput( path );
									}
								} }
							>
								{ __( 'Browse local file', 'mark-bricks' ) }
							</Button>
						) }
						<Button type="submit">
							{ __( 'Apply', 'mark-bricks' ) }
						</Button>
						{ imageNotice && (
							<Notice.Root
								intent="warning"
								style={ {
									flexBasis: '100%',
									textAlign: 'start',
								} }
							>
								<Notice.Description>
									{ imageNotice }
								</Notice.Description>
							</Notice.Root>
						) }
					</Stack>
				</BlockPlaceholder>
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
							setUrlInput( url || '' );
							setAltInput( alt || '' );
							setTitleInput( title || '' );
						}
					} }
					renderToggle={ ( { isOpen, onToggle } ) => (
						<ToolbarButton
							icon={ pencil }
							title={ __( 'Edit image', 'mark-bricks' ) }
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
										const nextUrl = urlInput.trim();
										if ( ! nextUrl ) {
											return;
										}
										setAttributes( {
											url: nextUrl,
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
								width: '400px',
							} }
						>
							<Stack direction="row" gap="sm" align="flex-end">
								<div style={ { flex: 1 } }>
									<InputControl
										label={ __(
											'URL or file path',
											'mark-bricks'
										) }
										placeholder={ __(
											'Paste or type URL or file path',
											'mark-bricks'
										) }
										value={ urlInput }
										onValueChange={ setUrlInput }
									/>
								</div>
								{ pickImageFile && (
									<Button
										variant="outline"
										onClick={ async () => {
											const path = await pickImageFile();
											if ( path ) {
												setUrlInput( path );
											}
										} }
									>
										{ __(
											'Browse local file',
											'mark-bricks'
										) }
									</Button>
								) }
							</Stack>
							{ imageNotice && (
								<Notice.Root intent="warning">
									<Notice.Description>
										{ imageNotice }
									</Notice.Description>
								</Notice.Root>
							) }
							<InputControl
								label={ __( 'Alt text', 'mark-bricks' ) }
								value={ altInput }
								onValueChange={ setAltInput }
								placeholder={ __(
									'Enter alt text…',
									'mark-bricks'
								) }
								description={ __(
									'Describes the image for screen readers.',
									'mark-bricks'
								) }
							/>
							<InputControl
								label={ __( 'Title', 'mark-bricks' ) }
								value={ titleInput }
								onValueChange={ setTitleInput }
								placeholder={ __(
									'Enter title…',
									'mark-bricks'
								) }
								description={ __(
									'Shown as a tooltip on hover.',
									'mark-bricks'
								) }
							/>
							<Stack justify="space-between">
								<Button
									variant="minimal"
									onClick={ () => {
										setAttributes( { url: '' } );
										setUrlInput( '' );
										onClose();
									} }
								>
									{ __( 'Reset', 'mark-bricks' ) }
								</Button>
								<Button
									type="submit"
									disabled={ ! urlInput.trim() }
								>
									{ __( 'Apply', 'mark-bricks' ) }
								</Button>
							</Stack>
						</Stack>
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
