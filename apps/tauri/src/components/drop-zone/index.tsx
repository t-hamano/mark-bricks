/**
 * External dependencies
 */
import clsx from 'clsx';
import type { ReactNode } from 'react';

/**
 * Internal dependencies
 */
import useFileDrop from './use-file-drop';
import './style.scss';

type Props = {
	children?: ReactNode;
	className?: string;
};

export default function DropZone( { children, className }: Props ) {
	const isDraggingOver = useFileDrop();

	return (
		<div
			className={ clsx(
				'mark-bricks-drop-zone',
				{ 'is-dragging-over': isDraggingOver },
				className
			) }
		>
			{ children }
		</div>
	);
}
