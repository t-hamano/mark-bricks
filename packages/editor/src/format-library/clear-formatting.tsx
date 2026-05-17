/**
 * WordPress dependencies
 */
import { BlockControls } from '@wordpress/block-editor';
import { ToolbarButton } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { cancelCircleFilled } from '@wordpress/icons';
import {
	removeFormat,
	store as richTextStore,
	type RichTextValue,
} from '@wordpress/rich-text';

/**
 * Internal dependencies
 */
import type { FormatEditProps } from './types';

const name = 'mark-bricks/clear-formatting';
const title = __( 'Clear formatting', 'mark-bricks' );

function Edit( { value, onChange, onFocus }: FormatEditProps ) {
	const formatTypes = useSelect(
		( select ) =>
			select( richTextStore )
				// @ts-expect-error -- `@wordpress/rich-text` types its
				// store as plain `Object`, so selectors are not reachable
				// through `select()`.
				.getFormatTypes(),
		[]
	);

	const onClick = () => {
		const next = formatTypes.reduce(
			( acc: RichTextValue, { name: formatName }: { name: string } ) =>
				formatName === name ? acc : removeFormat( acc, formatName ),
			value
		);
		onChange( next );
		onFocus();
	};

	return (
		<BlockControls group="inline">
			<ToolbarButton
				icon={ cancelCircleFilled }
				title={ title }
				onClick={ onClick }
			/>
		</BlockControls>
	);
}

export const clearFormatting = {
	name,
	title,
	tagName: 'span',
	className: 'mark-bricks-clear-formatting',
	interactive: false,
	object: false,
	edit: Edit,
};
