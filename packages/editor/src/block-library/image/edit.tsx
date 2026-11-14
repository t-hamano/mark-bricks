/**
 * External dependencies
 */
import { useCallback, useEffect, useState } from 'react';

/**
 * WordPress dependencies
 */
import { BlockControls, useBlockProps } from '@wordpress/block-editor';
import { Dropdown, ToolbarButton } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { Button, InputControl, Notice, Stack } from '@wordpress/ui';
import { cog, image as imageIcon, pencil } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import type { BlockEditProps } from '../types';
import type { BlockAttributes } from './types';
import { BlockPlaceholder } from '../../components/block-placeholder';
import { useFrontMatter } from '../../components/front-matter-editor/context';
import { isMarpFrontMatter } from '../../converter/front-matter';
import { useImageNotice, usePlatform } from '../../platform';
import { MarpImageSettings } from './marp-image-settings';
import {
	getKeywordsInText,
	parseMarpImageAlt,
	serializeMarpImageAlt,
} from './marp-image-options';

export default function Edit( props: BlockEditProps ) {
	const { attributes, setAttributes } =
		props as BlockEditProps< BlockAttributes >;
	const { url, alt, title } = attributes;
	const { pickImageFile, resolveImageSrc } = usePlatform();
	// Marp reads layout and size keywords such as `bg` from the alt text.
	// They are set from the Marp image settings, so the alt text field shows
	// only the other words.
	const { frontMatter } = useFrontMatter();
	const isMarp = isMarpFrontMatter( frontMatter );
	const getAltText = () =>
		isMarp ? parseMarpImageAlt( alt || '' ).text : alt || '';
	const buildAlt = ( text: string ) => {
		if ( ! isMarp ) {
			return text;
		}
		const options = parseMarpImageAlt( alt || '' );
		// Keeps the alt text as written when the words did not change.
		return text === options.text
			? alt || ''
			: serializeMarpImageAlt( { ...options, text } );
	};

	const [ urlInput, setUrlInput ] = useState( () => url || '' );
	const onChangeAlt = useCallback(
		( next: string ) => setAttributes( { alt: next } ),
		[ setAttributes ]
	);
	const isBackground = isMarp && parseMarpImageAlt( alt || '' ).background;
	const [ altInput, setAltInput ] = useState( () => alt || '' );
	// Words of the alt text that Marp would read as keywords, such as
	// `right` in the caption of a background image.
	const altKeywords = isMarp
		? getKeywordsInText( {
				...parseMarpImageAlt( alt || '' ),
				text: altInput,
			} )
		: [];
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
							setAltInput( getAltText() );
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
											alt: buildAlt( altInput ),
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
								label={
									isBackground
										? __( 'Caption', 'mark-bricks' )
										: __( 'Alt text', 'mark-bricks' )
								}
								value={ altInput }
								onValueChange={ setAltInput }
								placeholder={
									isBackground
										? __( 'Enter caption…', 'mark-bricks' )
										: __( 'Enter alt text…', 'mark-bricks' )
								}
								description={
									isMarp
										? __(
												'Set the placement, size and filters from Marp image settings in the toolbar.',
												'mark-bricks'
											)
										: __(
												'Describes the image for screen readers.',
												'mark-bricks'
											)
								}
							/>
							{ altKeywords.length > 0 && (
								<Notice.Root intent="warning">
									<Notice.Description>
										{ sprintf(
											/* translators: %s: Words of the alt text, such as "right". */
											__(
												'Marp reads these words as settings: %s',
												'mark-bricks'
											),
											altKeywords.join( ', ' )
										) }
									</Notice.Description>
								</Notice.Root>
							) }
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
				{ isMarp && (
					<Dropdown
						popoverProps={ { placement: 'bottom-start' } }
						renderToggle={ ( { isOpen, onToggle } ) => (
							<ToolbarButton
								icon={ cog }
								title={ __(
									'Marp image settings',
									'mark-bricks'
								) }
								onClick={ onToggle }
								aria-expanded={ isOpen }
								aria-haspopup="true"
							/>
						) }
						renderContent={ () => (
							<MarpImageSettings
								alt={ alt || '' }
								onChange={ onChangeAlt }
							/>
						) }
					/>
				) }
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
							alt={ getAltText() }
							onError={ () => setHasLoadError( true ) }
							onLoad={ () => setHasLoadError( false ) }
						/>
					)
				) }
			</div>
		</>
	);
}
