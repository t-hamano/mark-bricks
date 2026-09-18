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
 * Internal dependencies
 */
import {
	EditorShell,
	useContentStyles,
	type EditorHandle,
	type EditorStyles,
} from '../editor-shell';
import { EditorCanvas } from '../editor-canvas';
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
		enableCodeEditor?: boolean;
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

	return (
		<EditorShell
			ref={ ref }
			content={ content }
			onChange={ onChange }
			editorMode={ editorMode }
			onEditorModeChange={ onEditorModeChange }
			enableCodeEditor={ settings?.enableCodeEditor ?? true }
			settings={ settings }
			headerActions={ headerActions }
			style={ style }
			platform={ platform }
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
