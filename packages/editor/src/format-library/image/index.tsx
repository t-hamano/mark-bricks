/**
 * External dependencies
 */
import { useState } from 'react';

/**
 * WordPress dependencies
 */
import { BlockControls } from '@wordpress/block-editor';
import { ToolbarButton } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { inlineImage as inlineImageIcon } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { IMAGE_TITLE_QUOTE_ATTRIBUTE } from '../../converter/source-syntax/image-title-quote';
import { InlineImageUI, type FocusOnMount, type ImageValue } from './inline';
import { IMAGE_FORMAT, insertImage, updateImage } from './utils';
import type { FormatEditProps } from '../types';

const title = () => __( 'Inline image', 'mark-bricks' );

function Edit( {
	value,
	onChange,
	onFocus,
	isObjectActive,
	activeObjectAttributes,
	contentRef,
}: FormatEditProps ) {
	// RichText remounts this component whenever the selection moves onto or
	// off an image, so the popover opens by itself on a selected image and
	// closes as the selection leaves it.
	const [ isPopoverVisible, setIsPopoverVisible ] =
		useState( isObjectActive );
	const [ focusOnMount, setFocusOnMount ] = useState< FocusOnMount >( false );

	const showPopover = () => {
		setFocusOnMount( 'firstElement' );
		setIsPopoverVisible( true );
	};

	const closePopover = () => {
		setIsPopoverVisible( false );
		onFocus();
	};

	const applyImage = ( edited: ImageValue ) => {
		onChange(
			isObjectActive
				? updateImage( value, edited, activeObjectAttributes )
				: insertImage( value, edited )
		);
		closePopover();
	};

	const imageValue: ImageValue = isObjectActive
		? {
				url: activeObjectAttributes.url ?? '',
				alt: activeObjectAttributes.alt ?? '',
				title: activeObjectAttributes.title ?? '',
			}
		: { url: '', alt: '', title: '' };

	return (
		<>
			<BlockControls group="inline">
				<ToolbarButton
					icon={ inlineImageIcon }
					title={ title() }
					onClick={ showPopover }
					isActive={ isObjectActive || isPopoverVisible }
				/>
			</BlockControls>
			{ isPopoverVisible && (
				<InlineImageUI
					image={ imageValue }
					isEditing={ isObjectActive }
					focusOnMount={ focusOnMount }
					contentRef={ contentRef }
					onApply={ applyImage }
					onClose={ closePopover }
					onFocusOutside={ () => setIsPopoverVisible( false ) }
				/>
			) }
		</>
	);
}

/**
 * An image inside a block's inline content, e.g. `Text ![alt](image.png)` or
 * the badge `[![alt](badge.svg)](https://example.com)`.
 *
 * It is an object format, so RichText keeps the `<img>` as a single
 * replacement character rather than a span of formatted text.
 */
export const image = {
	name: IMAGE_FORMAT,
	title,
	tagName: 'img',
	className: null,
	attributes: {
		url: 'src',
		alt: 'alt',
		title: 'title',
		titleQuote: IMAGE_TITLE_QUOTE_ATTRIBUTE,
	},
	interactive: false,
	object: true,
	edit: Edit,
};
