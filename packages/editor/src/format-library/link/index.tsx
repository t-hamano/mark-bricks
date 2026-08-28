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
	// Whether the popover has been dismissed on the link the caret sits in.
	// Held in a ref, since suppressing the reopen below must not itself be a
	// change the effect doing the reopening reacts to.
	const isDismissed = useRef( false );

	const showPopover = useCallback( ( takesFocus: boolean ) => {
		isDismissed.current = false;
		setFocusOnMount( takesFocus ? 'firstElement' : false );
		setIsPopoverVisible( true );
	}, [] );

	// Hides the popover for as long as the caret stays on the current link.
	const hidePopover = useCallback( () => {
		isDismissed.current = true;
		setIsPopoverVisible( false );
	}, [] );

	// The caret enters and leaves links as the user moves through the text,
	// and the popover follows it: shown on the link the caret lands in, hidden
	// once it leaves, and left hidden for a link already dismissed.
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

	// Clicking brings a dismissed popover back. It also catches the click that
	// lands on the very edge of a link, where the caret ends up outside it and
	// the effect above therefore never runs.
	useLayoutEffect( () => {
		const editableContentElement = contentRef.current;
		if ( ! editableContentElement ) {
			return;
		}

		function handleClick( { target }: MouseEvent ) {
			// The block canvas is an iframe, so the clicked node comes from
			// another realm and `instanceof Element` would answer no to every
			// one of them. Asking the node itself is what works across the two.
			const element = target as Element | null;
			if (
				// Other formats may be nested within the link.
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

	// A popover that took no focus leaves the caret in the text, which is
	// where the Escape dismissing it has to be caught.
	useEffect( () => {
		const editableContentElement = contentRef.current;
		if ( ! editableContentElement || ! isPopoverVisible || focusOnMount ) {
			return;
		}

		function handleKeyDown( event: KeyboardEvent ) {
			if ( event.keyCode !== ESCAPE ) {
				return;
			}
			// Escape would otherwise travel on to the block editor, which
			// reads it as a request to select the block.
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
		// The caret lands inside the link just written, which the effect above
		// would otherwise take as a link to open the popover on.
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
	// A link the source wrote as a bare URL or an autolink cannot be unlinked:
	// dropping the format leaves the URL standing as plain text, which GFM
	// reads straight back as the same link.
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
					// The caret can cross straight from one link into the next
					// without the popover unmounting in between, which would
					// leave the fields holding the link it came from.
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
		// Registered so the popover can tell a link the source wrote as a bare
		// URL from one written as `[text](url)`. Nothing writes it back: the
		// converter puts it there, and editing a link drops it.
		syntax: LINK_SYNTAX_ATTRIBUTE,
	},
	interactive: true,
	object: false,
	edit: Edit,
};
