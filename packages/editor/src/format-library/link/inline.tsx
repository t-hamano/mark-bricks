/**
 * External dependencies
 */
import { useMemo } from 'react';

/**
 * WordPress dependencies
 */
import { LinkControl } from '@wordpress/block-editor';
import {
	Popover,
	__experimentalInputControl as InputControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useAnchor } from '@wordpress/rich-text';

/**
 * Internal dependencies
 */
import { LINK_TAG_NAME, type LinkValue } from './utils';
import type { FormatEditProps } from '../types';

/**
 * Where the focus lands when the popover mounts.
 */
export type FocusOnMount = 'firstElement' | false;

/**
 * The value `LinkControl` edits.
 */
type ControlValue = {
	url: string;
	title: string;
	linkTitle: string;
};

type Setting = {
	id: string;
	title: string;
};

/**
 * The one setting a Markdown link has, shown in the Advanced drawer.
 */
const SETTINGS = [
	{
		id: 'linkTitle',
		title: __( 'Title', 'mark-bricks' ),
		render: (
			setting: Setting,
			value: ControlValue,
			onChange: ( next: ControlValue ) => void
		) => (
			<InputControl
				label={ setting.title }
				value={ value.linkTitle ?? '' }
				onChange={ ( linkTitle?: string ) =>
					onChange( { ...value, linkTitle: linkTitle ?? '' } )
				}
				help={ __( 'Shown as a tooltip on hover.', 'mark-bricks' ) }
			/>
		),
	},
];

type Props = {
	link: LinkValue;
	isActive: boolean;
	canRemove: boolean;
	focusOnMount: FocusOnMount;
	contentRef: FormatEditProps[ 'contentRef' ];
	onApply: ( link: LinkValue ) => void;
	onRemove: () => void;
	onClose: () => void;
	onFocusOutside: () => void;
};

/**
 * The popover the link format opens over the link the caret is on.
 *
 * The contents are `LinkControl`, the same component the block editor puts
 * behind every other link: a link that already exists opens as a preview with
 * buttons to edit, unlink and copy it, and the edit button swaps in the form.
 *
 * @param props
 * @param props.link           The link the popover opens on.
 * @param props.isActive       Whether the caret is on an existing link.
 * @param props.canRemove      Whether unlinking the text would achieve anything.
 * @param props.focusOnMount   Where the focus lands as the popover opens.
 * @param props.contentRef     The editable element the popover anchors into.
 * @param props.onApply        Commits the edited link.
 * @param props.onRemove       Unlinks the text, leaving it in place.
 * @param props.onClose        Dismisses the popover, returning the focus.
 * @param props.onFocusOutside Dismisses the popover, leaving the focus be.
 */
export function InlineLinkUI( {
	link,
	isActive,
	canRemove,
	focusOnMount,
	contentRef,
	onApply,
	onRemove,
	onClose,
	onFocusOutside,
}: Props ) {
	const popoverAnchor = useAnchor( {
		editableContentElement: contentRef.current,
		settings: {
			tagName: LINK_TAG_NAME,
			className: null,
			isActive,
		} as unknown as Parameters< typeof useAnchor >[ 0 ][ 'settings' ],
	} );

	const value = useMemo< ControlValue >(
		() => ( { url: link.url, title: link.text, linkTitle: link.title } ),
		[ link.url, link.text, link.title ]
	);

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
		>
			<LinkControl
				value={ value }
				settings={ SETTINGS }
				hasTextControl
				showSuggestions={ false }
				// @ts-expect-error searchInputPlaceholder is missing from the type definitions
				searchInputPlaceholder={ __(
					'Paste or type URL',
					'mark-bricks'
				) }
				onChange={ ( next?: Partial< ControlValue > ) => {
					const { url, title, linkTitle } = { ...value, ...next };
					onApply( {
						text: title ?? '',
						url: url ?? '',
						title: linkTitle ?? '',
					} );
				} }
				onRemove={ canRemove ? onRemove : undefined }
				onCancel={ onClose }
			/>
		</Popover>
	);
}
