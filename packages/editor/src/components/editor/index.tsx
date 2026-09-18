/**
 * External dependencies
 */
import {
	forwardRef,
	lazy,
	Suspense,
	type CSSProperties,
	type Dispatch,
	type ForwardedRef,
	type ReactNode,
	type SetStateAction,
} from 'react';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { code } from '@wordpress/icons';
import { IconButton, Stack } from '@wordpress/ui';

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
import { useKeyboardShortcut } from '../keyboard-shortcuts/hooks';
import type { CodeEditorSettings } from '../text-editor';
import type { Platform } from '../../platform';

export type { EditorHandle, EditorStyles };

const TextEditor = lazy( async () => ( {
	default: ( await import( '../text-editor' ) ).TextEditor,
} ) );

type Props = {
	content: string;
	onChange: ( content: string ) => void;
	editorMode?: 'visual' | 'text';
	onEditorModeChange?: Dispatch< SetStateAction< 'visual' | 'text' > >;
	settings?: {
		showListViewByDefault?: boolean;
		showBlockBreadcrumbs?: boolean;
		showUndoRedo?: boolean;
		fixedToolbar?: boolean;
		focusMode?: boolean;
		spellCheck?: boolean;
		codeEditor?: Partial< CodeEditorSettings >;
	};
	headerActions?: ReactNode;
	editorStyles?: EditorStyles;
	style?: CSSProperties;
	platform?: Partial< Platform >;
};

// The full authoring experience: block editor and code editor, switchable
// via `editorMode` without losing undo history or block state. Consumers
// that only need one mode should use `BlockEditor` or `CodeEditor` instead,
// which don't pull the other mode into their bundle.
function UnforwardedEditor(
	{
		content,
		onChange,
		editorMode = 'visual',
		onEditorModeChange,
		settings,
		headerActions,
		editorStyles,
		style,
		platform,
	}: Props,
	ref: ForwardedRef< EditorHandle >
) {
	const contentStyles = useContentStyles( editorStyles );
	const toggleModeShortcut = useKeyboardShortcut( 'mark-bricks/toggle-mode' );

	return (
		<EditorShell
			ref={ ref }
			content={ content }
			onChange={ onChange }
			editorMode={ editorMode }
			onEditorModeChange={ onEditorModeChange }
			settings={ settings }
			style={ style }
			platform={ platform }
			headerActions={
				<Stack direction="row" align="center" gap="sm">
					<IconButton
						icon={ code }
						label={ __( 'Code editor', 'mark-bricks' ) }
						shortcut={ toggleModeShortcut }
						variant="minimal"
						tone="neutral"
						size="compact"
						onClick={ () =>
							onEditorModeChange?.( ( mode ) =>
								mode === 'text' ? 'visual' : 'text'
							)
						}
						aria-pressed={ editorMode === 'text' }
					/>
					{ headerActions }
				</Stack>
			}
		>
			{ editorMode === 'text' ? (
				<Suspense fallback={ null }>
					<TextEditor
						content={ content }
						onChange={ onChange }
						settings={ settings?.codeEditor }
					/>
				</Suspense>
			) : (
				<EditorCanvas
					styles={ contentStyles }
					spellCheck={ !! settings?.spellCheck }
				/>
			) }
		</EditorShell>
	);
}

export const Editor = forwardRef( UnforwardedEditor );
