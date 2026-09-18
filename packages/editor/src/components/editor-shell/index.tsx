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
import designTokensStyles from '@wordpress/theme/design-tokens.css?raw';
import componentsStyles from '@wordpress/components/build-style/style.css?raw';
import blockEditorContentStyles from '@wordpress/block-editor/build-style/content.css?raw';

/**
 * Internal dependencies
 */
import canvasStyles from './canvas.scss?inline';
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

// `@wordpress/ui` styles are not listed here: the canvas registers its
// document with the shared style runtime instead, which also covers
// styles registered after this module is evaluated. See
// `useCanvasStyleRuntime`.
const baseContentStyles = [
	{ css: designTokensStyles },
	{ css: componentsStyles },
	{ css: blockEditorContentStyles },
	{ css: canvasStyles },
];

export type EditorHandle = {
	flush: () => void;
};

export type EditorStyles = {
	contentWidth?: number;
	fontSize?: number;
	fontFamily?: string;
	css?: string;
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
	editorStyles?: EditorStyles;
	style?: CSSProperties;
	platform?: Partial< Platform >;
	renderMain: ( contentStyles: Array< { css: string } > ) => ReactNode;
};

// The chrome shared by every editor composition: header, footer, sidebars,
// keyboard shortcuts, and the block state they act on. `Editor`,
// `BlockEditor` and `CodeEditor` each supply their own `renderMain` for the
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
		editorStyles,
		style,
		platform,
		renderMain,
	}: EditorShellProps,
	ref: ForwardedRef< EditorHandle >
) {
	const hasFixedToolbar = !! settings?.fixedToolbar;
	const focusMode = !! settings?.focusMode;
	const contentWidth = editorStyles?.contentWidth;
	const fontSize = editorStyles?.fontSize;
	const fontFamily = editorStyles?.fontFamily;
	const customStyles = editorStyles?.css;

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

	const contentStyles = useMemo( () => {
		const styles = [ ...baseContentStyles ];
		if ( contentWidth ) {
			styles.push( {
				css: `:root{--mb-content-width:${ contentWidth }px}`,
			} );
		}
		if ( fontSize ) {
			styles.push( {
				css: `:root{--mb-font-size:${ fontSize }px}`,
			} );
		}
		if ( fontFamily ) {
			styles.push( {
				css: `:root{--mb-font-family:${ fontFamily }}`,
			} );
		}
		if ( customStyles ) {
			styles.push( { css: customStyles } );
		}
		return styles;
	}, [ contentWidth, fontSize, fontFamily, customStyles ] );

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
							{ renderMain( contentStyles ) }
						</main>
					</Stack>
					{ showBreadcrumbs && <EditorFooter /> }
				</BlockEditorProvider>
			</Stack>
		</PlatformProvider>
	);
}

export const EditorShell = forwardRef( UnforwardedEditorShell );
