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
// Outer document UI styles. Iframe (BlockCanvas) styles are handled
// separately via `?raw` imports in `editor-canvas`.
import '@wordpress/theme/design-tokens.css';
import '@wordpress/components/build-style/style.css';
import '@wordpress/block-editor/build-style/style.css';

/**
 * Internal dependencies
 */
import { useInitialListView, useMarkdownDocument } from './hooks';
import { EditorFooter } from '../editor-footer';
import { EditorHeader } from '../editor-header';
import { FrontMatterContext } from '../front-matter-editor/context';
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

function UnforwardedEditorShell(
	{
		content,
		onChange,
		editorMode,
		onEditorModeChange,
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
		frontMatter,
		setFrontMatter,
	} = useMarkdownDocument( { content, onChange, isVisualMode } );

	useImperativeHandle( ref, () => ( { flush } ), [ flush ] );

	const frontMatterContext = useMemo(
		() => ( { frontMatter, setFrontMatter } ),
		[ frontMatter, setFrontMatter ]
	);

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
			<FrontMatterContext.Provider value={ frontMatterContext }>
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
			</FrontMatterContext.Provider>
		</PlatformProvider>
	);
}

export const EditorShell = forwardRef( UnforwardedEditorShell );
