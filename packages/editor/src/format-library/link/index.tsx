/**
 * External dependencies
 */
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';

/**
 * WordPress dependencies
 */
import { BlockControls, RichTextShortcut } from '@wordpress/block-editor';
import { ToolbarButton } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { link as linkIcon } from '@wordpress/icons';
import { displayShortcut, ESCAPE } from '@wordpress/keycodes';
import { removeFormat } from '@wordpress/rich-text';

/**
 * Internal dependencies
 */
import { InlineLinkUI, type FocusOnMount } from './inline';
import {
	LINK_FORMAT,
	LINK_SYNTAX_ATTRIBUTE,
	LINK_TAG_NAME,
	getLinkValue,
	setLink,
	type LinkValue,
} from './utils';
import type { FormatEditProps } from '../types';

const title = () => __( 'Link', 'mark-bricks' );

function Edit( {
	isActive,
	activeAttributes,
	value,
	onChange,
	onFocus,
	contentRef,
}: FormatEditProps ) {
	const [ isPopoverVisible, setIsPopoverVisible ] = useState( false );
	const [ focusOnMount, setFocusOnMount ] = useState< FocusOnMount >( false );
	const isDismissed = useRef( false );

	const showPopover = useCallback( ( takesFocus: boolean ) => {
		isDismissed.current = false;
		setFocusOnMount( takesFocus ? 'firstElement' : false );
		setIsPopoverVisible( true );
	}, [] );

	const hidePopover = useCallback( () => {
		isDismissed.current = true;
		setIsPopoverVisible( false );
	}, [] );

	useEffect( () => {
		if ( isActive ) {
			if ( ! isDismissed.current ) {
				showPopover( false );
			}
			return;
		}
		isDismissed.current = false;
		setIsPopoverVisible( false );
	}, [ isActive, showPopover ] );

	useLayoutEffect( () => {
		const editableContentElement = contentRef.current;
		if ( ! editableContentElement ) {
			return;
		}

		function handleClick( { target }: MouseEvent ) {
			const element = target as Element | null;
			if (
				! element?.closest?.(
					`[contenteditable] ${ LINK_TAG_NAME }`
				) ||
				! isActive
			) {
				return;
			}
			showPopover( false );
		}

		editableContentElement.addEventListener( 'click', handleClick );

		return () => {
			editableContentElement.removeEventListener( 'click', handleClick );
		};
	}, [ contentRef, isActive, showPopover ] );

	useEffect( () => {
		const editableContentElement = contentRef.current;
		if ( ! editableContentElement || ! isPopoverVisible || focusOnMount ) {
			return;
		}

		function handleKeyDown( event: KeyboardEvent ) {
			if ( event.keyCode !== ESCAPE ) {
				return;
			}
			event.stopPropagation();
			hidePopover();
		}

		editableContentElement.addEventListener( 'keydown', handleKeyDown );

		return () => {
			editableContentElement.removeEventListener(
				'keydown',
				handleKeyDown
			);
		};
	}, [ contentRef, isPopoverVisible, focusOnMount, hidePopover ] );

	const applyLink = ( edited: LinkValue ) => {
		onChange( setLink( value, isActive, edited ) );
		hidePopover();
		onFocus();
	};

	const removeLink = () => {
		onChange( removeFormat( value, LINK_FORMAT ) );
		hidePopover();
		onFocus();
	};

	const closePopover = () => {
		hidePopover();
		onFocus();
	};

	const attributes = activeAttributes ?? {};
	const linkValue = getLinkValue( value, attributes, isActive );
	const canRemove = ! attributes.syntax;

	return (
		<>
			<RichTextShortcut
				type="primary"
				character="k"
				onUse={ () => showPopover( true ) }
			/>
			<RichTextShortcut
				type="primaryShift"
				character="k"
				onUse={ removeLink }
			/>
			<BlockControls group="inline">
				<ToolbarButton
					icon={ linkIcon }
					title={ title() }
					onClick={ () => showPopover( true ) }
					isActive={ isActive || isPopoverVisible }
					shortcut={ displayShortcut.primary( 'k' ) }
				/>
			</BlockControls>
			{ isPopoverVisible && (
				<InlineLinkUI
					key={ linkValue.url }
					link={ linkValue }
					isActive={ isActive }
					canRemove={ canRemove }
					focusOnMount={ focusOnMount }
					contentRef={ contentRef }
					onApply={ applyLink }
					onRemove={ removeLink }
					onClose={ closePopover }
					onFocusOutside={ hidePopover }
				/>
			) }
		</>
	);
}

export const link = {
	name: LINK_FORMAT,
	title,
	tagName: LINK_TAG_NAME,
	className: null,
	attributes: {
		url: 'href',
		title: 'title',
		syntax: LINK_SYNTAX_ATTRIBUTE,
	},
	interactive: true,
	object: false,
	edit: Edit,
};
