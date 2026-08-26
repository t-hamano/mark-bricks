/**
 * WordPress dependencies
 */
import { BlockControls } from '@wordpress/block-editor';
import { ToolbarButton } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
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
const title = () => __( 'Clear formatting', 'mark-bricks' );

const icon = (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<path d="M18.3,4.3l1.5,1.5c0.5,0.5,0.8,1.2,0.8,1.9v2.8c0,0.7-0.3,1.4-0.8,1.9L11,21.2C10.5,21.7,9.8,22,9.1,22 c-0.7,0-1.4-0.3-1.9-0.8l-1.5-1.5l-1.5-1.5c-0.5-0.5-0.8-1.2-0.8-1.9v-2.8c0-0.7,0.3-1.4,0.8-2L13,2.8C13.5,2.3,14.2,2,14.9,2 c0.7,0,1.4,0.3,1.9,0.8L18.3,4.3z M10.1,17.1l8.5-8.5c0.5-0.5,0.5-1.4,0-1.9l-2.8-2.8c-0.2-0.2-0.6-0.4-1-0.4s-0.7,0.1-0.9,0.4 l-8.5,8.5c-0.5,0.5-0.5,1.4,0,1.9l2.8,2.8C8.7,17.6,9.6,17.6,10.1,17.1z" />
	</svg>
);

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
				icon={ icon }
				title={ title() }
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
