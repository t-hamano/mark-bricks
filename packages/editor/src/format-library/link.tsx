/**
 * External dependencies
 */
import { useState } from 'react';

/**
 * WordPress dependencies
 */
import { BlockControls, RichTextShortcut } from '@wordpress/block-editor';
import {
	Button,
	Popover,
	TextControl,
	ToolbarButton,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { Stack } from '@wordpress/ui';
import { link as linkIcon } from '@wordpress/icons';
import { displayShortcut } from '@wordpress/keycodes';
import {
	applyFormat,
	removeFormat,
	useAnchor,
	type RichTextValue,
} from '@wordpress/rich-text';

/**
 * Internal dependencies
 */
import type { FormatEditProps } from './types';

const name = 'core/link';
const title = __( 'Link', 'mark-bricks' );

type InlineLinkUIProps = {
	value: RichTextValue;
	onChange: ( value: RichTextValue ) => void;
	onClose: () => void;
	contentRef: FormatEditProps[ 'contentRef' ];
	isActive: boolean;
	initialUrl: string;
	initialTitle: string;
};

function InlineLinkUI( {
	value,
	onChange,
	onClose,
	contentRef,
	isActive,
	initialUrl,
	initialTitle,
}: InlineLinkUIProps ) {
	const popoverAnchor = useAnchor( {
		editableContentElement: contentRef.current,
		settings: link as unknown as Parameters<
			typeof useAnchor
		>[ 0 ][ 'settings' ],
	} );

	const [ urlInput, setUrlInput ] = useState( () => initialUrl );
	const [ titleInput, setTitleInput ] = useState( () => initialTitle );

	const applyLink = () => {
		const trimmedUrl = urlInput.trim();
		if ( ! trimmedUrl ) {
			return;
		}
		const trimmedTitle = titleInput.trim();
		const attributes: Record< string, string > = { url: trimmedUrl };
		if ( trimmedTitle ) {
			attributes.title = trimmedTitle;
		}
		onChange(
			applyFormat( value, {
				type: name,
				attributes,
				// applyFormat accepts attributes at runtime; the public type omits it.
			} as unknown as Parameters< typeof applyFormat >[ 1 ] )
		);
		onClose();
	};

	const onRemoveLink = () => {
		onChange( removeFormat( value, name ) );
		onClose();
	};

	return (
		<Popover
			anchor={ popoverAnchor }
			onClose={ onClose }
			placement="bottom"
			offset={ 8 }
			shift
		>
			<Stack
				render={
					<form
						onSubmit={ ( event ) => {
							event.preventDefault();
							applyLink();
						} }
					/>
				}
				direction="column"
				gap="sm"
				style={ {
					width: '320px',
					padding: 'var(--wpds-dimension-padding-sm)',
				} }
			>
				<TextControl
					label={ __( 'URL', 'mark-bricks' ) }
					value={ urlInput }
					onChange={ ( next ) => setUrlInput( next ?? '' ) }
					placeholder={ __( 'Paste or type URL', 'mark-bricks' ) }
				/>
				<TextControl
					label={ __( 'Title', 'mark-bricks' ) }
					value={ titleInput }
					onChange={ ( next ) => setTitleInput( next ?? '' ) }
					placeholder={ __( 'Enter title…', 'mark-bricks' ) }
					help={ __( 'Shown as a tooltip on hover.', 'mark-bricks' ) }
				/>
				<Stack justify="flex-end" gap="sm">
					{ isActive && (
						<Button
							size="compact"
							variant="tertiary"
							isDestructive
							onClick={ onRemoveLink }
						>
							{ __( 'Remove', 'mark-bricks' ) }
						</Button>
					) }
					<Button
						size="compact"
						variant="primary"
						type="submit"
						disabled={ ! urlInput.trim() }
					>
						{ __( 'Apply', 'mark-bricks' ) }
					</Button>
				</Stack>
			</Stack>
		</Popover>
	);
}

function Edit( {
	isActive,
	activeAttributes,
	value,
	onChange,
	onFocus,
	contentRef,
}: FormatEditProps ) {
	const [ isPopoverVisible, setIsPopoverVisible ] = useState( false );

	const openPopover = () => setIsPopoverVisible( true );
	const closePopover = () => {
		setIsPopoverVisible( false );
		onFocus();
	};

	const onRemove = () => {
		onChange( removeFormat( value, name ) );
		onFocus();
	};

	return (
		<>
			<RichTextShortcut
				type="primary"
				character="k"
				onUse={ openPopover }
			/>
			<RichTextShortcut
				type="primaryShift"
				character="k"
				onUse={ onRemove }
			/>
			<BlockControls group="inline">
				<ToolbarButton
					icon={ linkIcon }
					title={ title }
					onClick={ openPopover }
					isActive={ isActive }
					shortcut={ displayShortcut.primary( 'k' ) }
				/>
			</BlockControls>
			{ isPopoverVisible && (
				<InlineLinkUI
					value={ value }
					onChange={ onChange }
					onClose={ closePopover }
					contentRef={ contentRef }
					isActive={ isActive }
					initialUrl={ activeAttributes?.url ?? '' }
					initialTitle={ activeAttributes?.title ?? '' }
				/>
			) }
		</>
	);
}

export const link = {
	name,
	title,
	tagName: 'a',
	className: null,
	attributes: {
		url: 'href',
		title: 'title',
	},
	interactive: true,
	object: false,
	edit: Edit,
};
