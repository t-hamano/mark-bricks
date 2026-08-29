/**
 * External dependencies
 */
import { useEffect, useState } from 'react';
import { getName, getVersion } from '@tauri-apps/api/app';
import {
	Editor,
	type CodeEditorSettings,
	type EditorStyles,
} from '@mark-bricks/editor';

/**
 * WordPress dependencies
 */
import { useDispatch, useSelect } from '@wordpress/data';
import { store as preferencesStore } from '@wordpress/preferences';
import { Stack, useEnableWpCompatOverlaySlot } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import AboutModal from '../about-modal';
import DirtyConfirmDialog from '../dirty-confirm-dialog';
import EditorPlaceholder from '../editor-placeholder';
import HeaderActions from '../header-actions';
import KeyboardShortcutsModal from '../keyboard-shortcuts-modal';
import PreferencesModal from '../preferences-modal';
import Tabbar from '../tabbar';
import useAppCloseGuard from '../../hooks/use-app-close-guard';
import useAutoUpdater from '../../hooks/use-auto-updater';
import useFileOpenEvents from '../../hooks/use-file-open-events';
import useShortcuts from '../../hooks/use-shortcuts';
import useWindowTitle from '../../hooks/use-window-title';
import platform from '../../platform';
import tabsStore from '../../store';
import './style.scss';

export function App() {
	// Portals @wordpress/ui overlays into a body-level slot that stacks above
	// @wordpress/components overlays. Required while both libraries coexist.
	useEnableWpCompatOverlaySlot();

	useShortcuts();
	useAutoUpdater();
	useFileOpenEvents();

	const [ appName, setAppName ] = useState< string >( '' );
	const [ appVersion, setAppVersion ] = useState< string >( '' );
	const [ editorMode, setEditorMode ] = useState< 'visual' | 'text' >(
		'visual'
	);

	useEffect( () => {
		getName().then( setAppName );
		getVersion().then( setAppVersion );
	}, [] );

	const {
		activeTab,
		tabs,
		pendingCloseId,
		showListViewByDefault,
		showBlockBreadcrumbs,
		fixedToolbar,
		focusMode,
		spellCheck,
		editorStyles,
		codeEditor,
	} = useSelect( ( select ) => {
		const { getTabs, getActiveTabId, getPendingCloseId } =
			select( tabsStore );
		const { get } = select( preferencesStore );
		const all = getTabs();
		const activeId = getActiveTabId();
		return {
			activeTab: all.find( ( t ) => t.id === activeId ),
			tabs: all,
			pendingCloseId: getPendingCloseId(),
			showListViewByDefault: !! get( 'core', 'showListViewByDefault' ),
			showBlockBreadcrumbs: !! get( 'core', 'showBlockBreadcrumbs' ),
			fixedToolbar: !! get( 'core', 'fixedToolbar' ),
			focusMode: !! get( 'core', 'focusMode' ),
			spellCheck: !! get( 'mark-bricks', 'spellCheck' ),
			editorStyles: get( 'mark-bricks', 'editorStyles' ) as
				| EditorStyles
				| undefined,
			codeEditor: get( 'mark-bricks', 'codeEditor' ) as
				| CodeEditorSettings
				| undefined,
		};
	}, [] );

	const { setTabContent, setTabDirty } = useDispatch( tabsStore );

	useWindowTitle( activeTab );
	useAppCloseGuard( { tabs, pendingCloseId } );

	return (
		<Stack className="app" direction="column">
			{ tabs.length > 0 && <Tabbar /> }
			{ tabs.length === 0 || ! activeTab ? (
				<EditorPlaceholder />
			) : (
				<Editor
					key={ activeTab.id }
					content={ activeTab.content }
					onChange={ ( content ) => {
						setTabContent( activeTab.id, content );
						setTabDirty( activeTab.id, true );
					} }
					editorMode={ editorMode }
					onEditorModeChange={ setEditorMode }
					settings={ {
						showListViewByDefault,
						showBlockBreadcrumbs,
						fixedToolbar,
						focusMode,
						spellCheck,
						codeEditor,
					} }
					editorStyles={ editorStyles }
					platform={ platform }
					headerActions={
						<HeaderActions
							editorMode={ editorMode }
							onEditorModeChange={ setEditorMode }
						/>
					}
				/>
			) }
			<DirtyConfirmDialog />
			<PreferencesModal />
			<AboutModal name={ appName } version={ appVersion } />
			<KeyboardShortcutsModal />
		</Stack>
	);
}
