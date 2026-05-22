/**
 * WordPress dependencies
 */
import { BlockControls, RichTextShortcut } from '@wordpress/block-editor';
import { ToolbarButton } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { code as codeIcon } from '@wordpress/icons';
import { displayShortcut } from '@wordpress/keycodes';
import { toggleFormat } from '@wordpress/rich-text';

/**
 * Internal dependencies
 */
import type { FormatEditProps } from './types';

const name = 'core/code';
const title = () => __( 'Inline code', 'mark-bricks' );

function Edit( { isActive, value, onChange, onFocus }: FormatEditProps ) {
	const onClick = () => {
		onChange( toggleFormat( value, { type: name } ) );
		onFocus();
	};

	return (
		<>
			<RichTextShortcut type="access" character="x" onUse={ onClick } />
			<BlockControls group="inline">
				<ToolbarButton
					icon={ codeIcon }
					title={ title() }
					onClick={ onClick }
					isActive={ isActive }
					shortcut={ displayShortcut.access( 'x' ) }
				/>
			</BlockControls>
		</>
	);
}

export const code = {
	name,
	title,
	tagName: 'code',
	className: null,
	interactive: false,
	object: false,
	edit: Edit,
};
