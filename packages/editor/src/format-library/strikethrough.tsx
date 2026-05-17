/**
 * WordPress dependencies
 */
import { BlockControls, RichTextShortcut } from '@wordpress/block-editor';
import { ToolbarButton } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { formatStrikethrough } from '@wordpress/icons';
import { displayShortcut } from '@wordpress/keycodes';
import { toggleFormat } from '@wordpress/rich-text';

/**
 * Internal dependencies
 */
import type { FormatEditProps } from './types';

const name = 'core/strikethrough';
const title = __( 'Strikethrough', 'mark-bricks' );

function Edit( { isActive, value, onChange, onFocus }: FormatEditProps ) {
	const onClick = () => {
		onChange( toggleFormat( value, { type: name } ) );
		onFocus();
	};

	return (
		<>
			<RichTextShortcut type="access" character="d" onUse={ onClick } />
			<BlockControls group="inline">
				<ToolbarButton
					icon={ formatStrikethrough }
					title={ title }
					onClick={ onClick }
					isActive={ isActive }
					shortcut={ displayShortcut.access( 'd' ) }
				/>
			</BlockControls>
		</>
	);
}

export const strikethrough = {
	name,
	title,
	tagName: 's',
	className: null,
	interactive: false,
	object: false,
	edit: Edit,
};
