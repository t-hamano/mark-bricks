/**
 * External dependencies
 */
import {
	useMemo,
	useRef,
	type CSSProperties,
	type Dispatch,
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
import { EditorCanvas } from '../editor-canvas';
import { EditorFooter } from '../editor-footer';
import { EditorHeader } from '../editor-header';
import { InserterSidebar } from '../inserter-sidebar';
import { KeyboardShortcuts } from '../keyboard-shortcuts';
import { ListViewSidebar } from '../list-view-sidebar';
import { MobileBlockToolbar } from '../mobile-block-toolbar';
import { TextEditor, type CodeEditorSettings } from '../text-editor';
import { PlatformProvider, type Platform } from '../../platform';
import { store as editorStore } from '../../store';
import './style.scss';

const wpUiStyles = Array.from(
	document.head.querySelectorAll( 'style[data-wp-hash]' )
)
	.map( ( el ) => el.textContent ?? '' )
	.join( '\n' );

const baseContentStyles = [
	{ css: designTokensStyles },
	{ css: componentsStyles },
	{ css: blockEditorContentStyles },
	{ css: wpUiStyles },
	{ css: canvasStyles },
];

export type EditorStyles = {
	contentWidth?: number;
	fontSize?: number;
	fontFamily?: string;
	css?: string;
};

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

export function Editor( {
	content,
	onChange,
	editorMode = 'visual',
	onEditorModeChange,
	settings,
	headerActions,
	editorStyles,
	style,
	platform,
}: Props ) {
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

	const { blocks, onBlocksChange, onInput, undo, redo, canUndo, canRedo } =
		useMarkdownDocument( { content, onChange, isVisualMode } );

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
				className="editor"
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
					<Stack className="editor__body">
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
						<main className="editor__content">
							{ editorMode === 'text' ? (
								<TextEditor
									content={ content }
									onChange={ onChange }
									settings={ settings?.codeEditor }
								/>
							) : (
								<EditorCanvas
									styles={ contentStyles }
									spellCheck={ !! settings?.spellCheck }
								/>
							) }
						</main>
					</Stack>
					{ showBreadcrumbs && <EditorFooter /> }
				</BlockEditorProvider>
			</Stack>
		</PlatformProvider>
	);
}
