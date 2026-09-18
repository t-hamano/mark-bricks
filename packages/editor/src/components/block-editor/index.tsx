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
	return (
		<EditorShell
			ref={ ref }
			content={ content }
			onChange={ onChange }
			editorMode="visual"
			enableCodeEditor={ false }
			settings={ settings }
			headerActions={ headerActions }
			editorStyles={ editorStyles }
			style={ style }
			platform={ platform }
			renderMain={ ( contentStyles ) => (
				<EditorCanvas
					styles={ contentStyles }
					spellCheck={ !! settings?.spellCheck }
				/>
			) }
		/>
	);
}

export const BlockEditor = forwardRef( UnforwardedBlockEditor );
