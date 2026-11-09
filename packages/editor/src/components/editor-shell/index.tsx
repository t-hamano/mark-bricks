/**
 * External dependencies
 */
import {
	forwardRef,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
	type CSSProperties,
	type Dispatch,
	type ForwardedRef,
	type ReactNode,
	type SetStateAction,
} from 'react';
import type { editor as MonacoEditor } from 'monaco-editor';

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
import {
	DEFAULT_SIDE_PANEL_SIZE,
	SidePanelResizer,
} from './side-panel-resizer';
import { SourceLineSync, type SourceLineSyncHandle } from './source-line-sync';
import { AiAssistant } from '../ai-sidebar';
import { EditorFooter } from '../editor-footer';
import { EditorHeader } from '../editor-header';
import { FrontMatterContext } from '../front-matter-editor/context';
import { InserterSidebar } from '../inserter-sidebar';
import { KeyboardShortcuts } from '../keyboard-shortcuts';
import { ListViewSidebar } from '../list-view-sidebar';
import { MobileBlockToolbar } from '../mobile-block-toolbar';
import { useMarpSeparatorTitle } from '../../block-library/separator/use-marp-title';
import { isMarpFrontMatter } from '../../converter/front-matter';
import { PlatformProvider, type Platform } from '../../platform';
import { TextEditorContext } from '../../ai/text-editor-context';
import { store as editorStore } from '../../store';
import './style.scss';

export { useContentStyles } from './hooks';
export type { EditorStyles } from './hooks';

export type EditorHandle = {
	flush: () => void;
	// Selects the top-level block that shows a line of the document, counted
	// from 0, and scrolls it into view. Does nothing in the code editor.
	selectLine: ( line: number ) => void;
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
	// Called with the line of the document, counted from 0, that the
	// selected top-level block starts at, whenever it changes, or `null`
	// when no block is selected or the code editor is shown.
	onSelectedLineChange?: ( line: number | null ) => void;
	// Shown to the right of the content, such as a preview of the document.
	// On a narrow viewport it takes the content's place, which stays
	// mounted, hidden, so that it keeps its state.
	sidePanel?: ReactNode;
	// The side panel's share of the width, in percent, which the user changes
	// with the bar between the content and the side panel. Left out, the
	// shell keeps it itself, starting at half.
	sidePanelSize?: number;
	onSidePanelSizeChange?: ( size: number ) => void;
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
		onSelectedLineChange,
		sidePanel,
		sidePanelSize: controlledSidePanelSize,
		onSidePanelSizeChange,
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
	const aiSidebarToggleRef = useRef< HTMLButtonElement >( null );
	const textEditorRef = useRef< MonacoEditor.IStandaloneCodeEditor >( null );
	const hasAi = !! platform?.ai;
	const hasSidePanel = !! sidePanel;
	const contentRef = useRef< HTMLElement >( null );
	const sidePanelRef = useRef< HTMLDivElement >( null );
	const [ ownSidePanelSize, setOwnSidePanelSize ] = useState(
		DEFAULT_SIDE_PANEL_SIZE
	);
	const sidePanelSize = controlledSidePanelSize ?? ownSidePanelSize;
	function setSidePanelSize( size: number ) {
		setOwnSidePanelSize( size );
		onSidePanelSizeChange?.( size );
	}

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

	const sourceLineSyncRef = useRef< SourceLineSyncHandle >( null );
	useImperativeHandle(
		ref,
		() => ( {
			flush,
			selectLine: ( line ) =>
				sourceLineSyncRef.current?.selectLine( line ),
		} ),
		[ flush ]
	);

	const frontMatterContext = useMemo(
		() => ( { frontMatter, setFrontMatter } ),
		[ frontMatter, setFrontMatter ]
	);

	useInitialListView( !! settings?.showListViewByDefault );
	useMarpSeparatorTitle( isMarpFrontMatter( frontMatter ) );

	const { isInserterOpened, isListViewOpened, isAiSidebarOpened } = useSelect(
		( select ) => {
			const {
				isInserterOpened: _isInserterOpened,
				isListViewOpened: _isListViewOpened,
				isAiSidebarOpened: _isAiSidebarOpened,
			} = select( editorStore );
			return {
				isInserterOpened: _isInserterOpened(),
				isListViewOpened: _isListViewOpened(),
				isAiSidebarOpened: _isAiSidebarOpened(),
			};
		},
		[]
	);

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
			<TextEditorContext.Provider value={ textEditorRef }>
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
							<SourceLineSync
								blocks={ blocks }
								frontMatter={ frontMatter }
								content={ content }
								enabled={ isVisualMode }
								onSelectedLineChange={ onSelectedLineChange }
								handleRef={ sourceLineSyncRef }
							/>
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
								aiSidebarToggleRef={ aiSidebarToggleRef }
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
								<main
									ref={ contentRef }
									className="editor-shell__content"
									hidden={ hasSidePanel && isMobileViewport }
									style={
										hasSidePanel
											? { flexGrow: 100 - sidePanelSize }
											: undefined
									}
								>
									{ children }
								</main>
								{ hasSidePanel && (
									<div
										ref={ sidePanelRef }
										className="editor-shell__side-panel"
										style={ { flexGrow: sidePanelSize } }
									>
										{ ! isMobileViewport && (
											<SidePanelResizer
												contentRef={ contentRef }
												sidePanelRef={ sidePanelRef }
												size={ sidePanelSize }
												onChange={ setSidePanelSize }
											/>
										) }
										{ sidePanel }
									</div>
								) }
								{ hasAi && (
									<AiAssistant
										toggleRef={ aiSidebarToggleRef }
										isOpened={ isAiSidebarOpened }
										editorMode={ editorMode }
										frontMatter={ frontMatter }
									/>
								) }
							</Stack>
							{ showBreadcrumbs && <EditorFooter /> }
						</BlockEditorProvider>
					</Stack>
				</FrontMatterContext.Provider>
			</TextEditorContext.Provider>
		</PlatformProvider>
	);
}

export const EditorShell = forwardRef( UnforwardedEditorShell );
