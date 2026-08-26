/**
 * External dependencies
 */
import type { ComponentProps, ReactNode } from 'react';

/**
 * WordPress dependencies
 */
import { EmptyState } from '@wordpress/ui';

// `style.scss` is not imported here: this only renders inside the block canvas
// iframe, which is styled by `../editor/canvas.scss`.

type Props = {
	icon: ComponentProps< typeof EmptyState.Icon >[ 'icon' ];
	label: string;
	instructions: string;
	children?: ReactNode;
};

export function BlockPlaceholder( {
	icon,
	label,
	instructions,
	children,
}: Props ) {
	return (
		<EmptyState.Root className="block-placeholder">
			<EmptyState.Icon icon={ icon } />
			<EmptyState.Title render={ <div /> }>{ label }</EmptyState.Title>
			<EmptyState.Description>{ instructions }</EmptyState.Description>
			{ children && (
				<EmptyState.Actions>{ children }</EmptyState.Actions>
			) }
		</EmptyState.Root>
	);
}
