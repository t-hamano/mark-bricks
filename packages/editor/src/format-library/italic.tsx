/**
 * WordPress dependencies
 */
import { BlockControls, RichTextShortcut } from '@wordpress/block-editor';
import { ToolbarButton } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { formatItalic } from '@wordpress/icons';
import { displayShortcut } from '@wordpress/keycodes';
import { toggleFormat } from '@wordpress/rich-text';

/**
 * Internal dependencies
 */
import type { FormatEditProps } from './types';

const name = 'core/italic';
const title = () => __( 'Italic', 'mark-bricks' );

function Edit( { isActive, value, onChange, onFocus }: FormatEditProps ) {
	const onClick = () => {
		onChange( toggleFormat( value, { type: name } ) );
		onFocus();
	};

	return (
		<>
			<RichTextShortcut type="primary" character="i" onUse={ onClick } />
			<BlockControls group="inline">
				<ToolbarButton
					icon={ formatItalic }
					title={ title() }
					onClick={ onClick }
					isActive={ isActive }
					shortcut={ displayShortcut.primary( 'i' ) }
				/>
			</BlockControls>
		</>
	);
}

export const italic = {
	name,
	title,
	tagName: 'em',
	className: null,
	interactive: false,
	object: false,
	edit: Edit,
};
