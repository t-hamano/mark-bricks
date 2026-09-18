/**
 * External dependencies
 */
import {
	forwardRef,
	type CSSProperties,
	type ForwardedRef,
	type ReactNode,
} from 'react';

/**
 * Internal dependencies
 */
import {
	EditorShell,
	useContentStyles,
	type EditorHandle,
	type EditorStyles,
} from '../editor-shell';
import { EditorCanvas } from '../editor-canvas';
import type { Platform } from '../../platform';

export type { EditorHandle, EditorStyles };

type Props = {
	content: string;
	onChange: ( content: string ) => void;
	settings?: {
		showListViewByDefault?: boolean;
		showBlockBreadcrumbs?: boolean;
		showUndoRedo?: boolean;
		fixedToolbar?: boolean;
		focusMode?: boolean;
		spellCheck?: boolean;
	};
	headerActions?: ReactNode;
	editorStyles?: EditorStyles;
	style?: CSSProperties;
	platform?: Partial< Platform >;
};

function UnforwardedBlockEditor(
	{
		content,
		onChange,
		settings,
		headerActions,
		editorStyles,
		style,
		platform,
	}: Props,
	ref: ForwardedRef< EditorHandle >
) {
	const contentStyles = useContentStyles( editorStyles );

	return (
		<EditorShell
			ref={ ref }
			content={ content }
			onChange={ onChange }
			editorMode="visual"
			settings={ settings }
			headerActions={ headerActions }
			style={ style }
			platform={ platform }
		>
			<EditorCanvas
				styles={ contentStyles }
				spellCheck={ !! settings?.spellCheck }
			/>
		</EditorShell>
	);
}

export const BlockEditor = forwardRef( UnforwardedBlockEditor );
