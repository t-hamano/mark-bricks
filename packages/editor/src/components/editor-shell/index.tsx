/**
 * External dependencies
 */
import {
	forwardRef,
	useImperativeHandle,
	useMemo,
	useRef,
	type CSSProperties,
	type Dispatch,
	type ForwardedRef,
	type ReactNode,
	type SetStateAction,
} from 'react';

/**
 * WordPress dependencies
 */
import { BlockEditorProvider } from '@wordpress/block-editor';
import { __unstableAnimatePresence as AnimatePresence } from '@wordpress/components';
import { useViewportMatch } from '@wordpress/compose';
import { useSelect } from '@wordpress/data';
import { ShortcutProvider } from '@wordpress/keyboard-shortcuts';
import { Stack } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import { useInitialListView, useMarkdownDocument } from './hooks';
import { EditorFooter } from '../editor-footer';
import { EditorHeader } from '../editor-header';
import { InserterSidebar } from '../inserter-sidebar';
import { KeyboardShortcuts } from '../keyboard-shortcuts';
import { ListViewSidebar } from '../list-view-sidebar';
import { MobileBlockToolbar } from '../mobile-block-toolbar';
import { PlatformProvider, type Platform } from '../../platform';
import { store as editorStore } from '../../store';
import './style.scss';

export { useContentStyles } from './hooks';
export type { EditorStyles } from './hooks';

export type EditorHandle = {
	flush: () => void;
};

export type EditorShellProps = {
	content: string;
	onChange: ( content: string ) => void;
	editorMode: 'visual' | 'text';
	onEditorModeChange?: Dispatch< SetStateAction< 'visual' | 'text' > >;
	enableCodeEditor: boolean;
	settings?: {
		showListViewByDefault?: boolean;
		showBlockBreadcrumbs?: boolean;
		showUndoRedo?: boolean;
		fixedToolbar?: boolean;
		focusMode?: boolean;
	};
	headerActions?: ReactNode;
	style?: CSSProperties;
	platform?: Partial< Platform >;
	children: ReactNode;
};

// The chrome shared by every editor composition: header, footer, sidebars,
// keyboard shortcuts, and the block state they act on. `Editor`,
// `BlockEditor` and `CodeEditor` each supply their own `children` for the
// content area and their own `editorMode`/`enableCodeEditor`.
function UnforwardedEditorShell(
	{
		content,
		onChange,
		editorMode,
		onEditorModeChange,
		enableCodeEditor,
		settings,
		headerActions,
		style,
		platform,
		children,
	}: EditorShellProps,
	ref: ForwardedRef< EditorHandle >
) {
	const hasFixedToolbar = !! settings?.fixedToolbar;
	const focusMode = !! settings?.focusMode;

	const isMobileViewport = useViewportMatch( 'medium', '<' );
	const isVisualMode = editorMode === 'visual';
	const showMobileToolbar = isVisualMode && isMobileViewport;
	const showBreadcrumbs =
		( settings?.showBlockBreadcrumbs ?? true ) &&
		isVisualMode &&
		! isMobileViewport;

	const inserterToggleRef = useRef< HTMLButtonElement >( null );
	const listViewToggleRef = useRef< HTMLButtonElement >( null );

	const {
		blocks,
		onBlocksChange,
		onInput,
		undo,
		redo,
		canUndo,
		canRedo,
		flush,
	} = useMarkdownDocument( { content, onChange, isVisualMode } );

	useImperativeHandle( ref, () => ( { flush } ), [ flush ] );

	useInitialListView( !! settings?.showListViewByDefault );

	const { isInserterOpened, isListViewOpened } = useSelect( ( select ) => {
		const {
			isInserterOpened: _isInserterOpened,
			isListViewOpened: _isListViewOpened,
		} = select( editorStore );
		return {
			isInserterOpened: _isInserterOpened(),
			isListViewOpened: _isListViewOpened(),
		};
	}, [] );

	const blockEditorSettings = useMemo(
		() => ( {
			hasFixedToolbar: hasFixedToolbar || isMobileViewport,
			focusMode,
			allowRightClickOverrides: true,
		} ),
		[ hasFixedToolbar, focusMode, isMobileViewport ]
	);

	return (
		<PlatformProvider platform={ platform }>
			<Stack
				render={ <ShortcutProvider /> }
				className="editor-shell"
				direction="column"
				style={ style }
			>
				<BlockEditorProvider
					value={ blocks }
					onChange={ onBlocksChange }
					onInput={ onInput }
					settings={ blockEditorSettings }
				>
					<KeyboardShortcuts
						canUndo={ canUndo }
						canRedo={ canRedo }
						onUndo={ undo }
						onRedo={ redo }
						editorMode={ editorMode }
						onEditorModeChange={ onEditorModeChange }
						enableCodeEditor={ enableCodeEditor }
					/>
					<EditorHeader
						canUndo={ canUndo }
						canRedo={ canRedo }
						onUndo={ undo }
						onRedo={ redo }
						showUndoRedo={ settings?.showUndoRedo ?? true }
						inserterToggleRef={ inserterToggleRef }
						listViewToggleRef={ listViewToggleRef }
						editorMode={ editorMode }
						onEditorModeChange={ onEditorModeChange }
						enableCodeEditor={ enableCodeEditor }
						fixedToolbar={ hasFixedToolbar }
						headerActions={ headerActions }
					/>
					{ showMobileToolbar && <MobileBlockToolbar /> }
					<Stack className="editor-shell__body">
						<AnimatePresence initial={ false }>
							{ isVisualMode && isInserterOpened && (
								<InserterSidebar
									toggleRef={ inserterToggleRef }
								/>
							) }
							{ isVisualMode && isListViewOpened && (
								<ListViewSidebar
									toggleRef={ listViewToggleRef }
								/>
							) }
						</AnimatePresence>
						<main className="editor-shell__content">
							{ children }
						</main>
					</Stack>
					{ showBreadcrumbs && <EditorFooter /> }
				</BlockEditorProvider>
			</Stack>
		</PlatformProvider>
	);
}

export const EditorShell = forwardRef( UnforwardedEditorShell );
