/**
 * External dependencies
 */
import { useEffect, useState } from 'react';
import { useKeyboardShortcut } from '@mark-bricks/editor';

/**
 * WordPress dependencies
 */
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { store as interfaceStore } from '@wordpress/interface';
import { store as preferencesStore } from '@wordpress/preferences';
import { moreVertical } from '@wordpress/icons';
import { Button, IconButton, Menu, Stack } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import {
	newFile,
	openFile,
	saveActiveFile,
	saveActiveFileAs,
} from '../../actions';
import tabsStore from '../../store';
import { ABOUT_MODAL_NAME } from '../about-modal';
import { KEYBOARD_SHORTCUTS_MODAL_NAME } from '../keyboard-shortcuts-modal';
import { PREFERENCES_MODAL_NAME } from '../preferences-modal';
import './style.scss';

type Props = {
	editorMode: 'visual' | 'text';
	onEditorModeChange: ( mode: 'visual' | 'text' ) => void;
};

export default function HeaderActions( {
	editorMode,
	onEditorModeChange,
}: Props ) {
	const {
		isActiveTabDirty,
		isPreferencesOpened,
		isFixedToolbar,
		isFocusMode,
	} = useSelect( ( select ) => {
		const { getTabs, getActiveTabId } = select( tabsStore );
		const { isModalActive } = select( interfaceStore );
		const { get } = select( preferencesStore );
		const activeTab = getTabs().find( ( t ) => t.id === getActiveTabId() );
		return {
			isActiveTabDirty: !! activeTab?.isDirty,
			isPreferencesOpened: isModalActive( PREFERENCES_MODAL_NAME ),
			isFixedToolbar: !! get( 'core', 'fixedToolbar' ),
			isFocusMode: !! get( 'core', 'focusMode' ),
		};
	}, [] );
	const newFileShortcut = useKeyboardShortcut( 'mark-bricks/new-file' );
	const openFileShortcut = useKeyboardShortcut( 'mark-bricks/open-file' );
	const saveFileShortcut = useKeyboardShortcut( 'mark-bricks/save-file' );
	const saveFileAsShortcut = useKeyboardShortcut(
		'mark-bricks/save-file-as'
	);
	const toggleModeShortcut = useKeyboardShortcut( 'mark-bricks/toggle-mode' );
	const keyboardShortcutsShortcut = useKeyboardShortcut(
		'mark-bricks/keyboard-shortcuts'
	);
	const { openModal } = useDispatch( interfaceStore );
	const { set: setPreference } = useDispatch( preferencesStore );
	const [ isOptionsMenuOpen, setIsOptionsMenuOpen ] = useState( false );
	useEffect( () => {
		if ( isPreferencesOpened ) {
			setIsOptionsMenuOpen( false );
		}
	}, [ isPreferencesOpened ] );

	return (
		<Stack
			className="header-actions"
			direction="row"
			align="center"
			gap="sm"
		>
			<Button
				size="compact"
				onClick={ () => {
					saveActiveFile();
				} }
				disabled={ ! isActiveTabDirty }
			>
				{ __( 'Save', 'mark-bricks' ) }
			</Button>
			<Menu.Root
				open={ isOptionsMenuOpen }
				onOpenChange={ setIsOptionsMenuOpen }
			>
				<Menu.Trigger
					render={
						<IconButton
							icon={ moreVertical }
							label={ __( 'Options', 'mark-bricks' ) }
							variant="minimal"
							tone="neutral"
							size="compact"
						/>
					}
				/>
				<Menu.Popup
					className="header-actions__menu"
					positioner={ <Menu.Positioner align="end" /> }
				>
					<Menu.Group>
						<Menu.GroupLabel>
							{ __( 'Files', 'mark-bricks' ) }
						</Menu.GroupLabel>
						<Menu.Item
							shortcut={ newFileShortcut }
							onClick={ () => newFile() }
						>
							<Menu.ItemLabel>
								{ __( 'New', 'mark-bricks' ) }
							</Menu.ItemLabel>
						</Menu.Item>
						<Menu.Item
							shortcut={ openFileShortcut }
							onClick={ () => openFile() }
						>
							<Menu.ItemLabel>
								{ __( 'Open…', 'mark-bricks' ) }
							</Menu.ItemLabel>
						</Menu.Item>
						<Menu.Item
							shortcut={ saveFileShortcut }
							onClick={ () => saveActiveFile() }
						>
							<Menu.ItemLabel>
								{ __( 'Save', 'mark-bricks' ) }
							</Menu.ItemLabel>
						</Menu.Item>
						<Menu.Item
							shortcut={ saveFileAsShortcut }
							onClick={ () => saveActiveFileAs() }
						>
							<Menu.ItemLabel>
								{ __( 'Save As…', 'mark-bricks' ) }
							</Menu.ItemLabel>
						</Menu.Item>
					</Menu.Group>
					<Menu.Separator />
					<Menu.Group>
						<Menu.GroupLabel>
							{ __( 'View', 'mark-bricks' ) }
						</Menu.GroupLabel>
						<Menu.CheckboxItem
							checked={ isFixedToolbar }
							onCheckedChange={ ( checked ) =>
								setPreference( 'core', 'fixedToolbar', checked )
							}
						>
							<Menu.ItemLabel>
								{ __( 'Top toolbar', 'mark-bricks' ) }
							</Menu.ItemLabel>
							<Menu.ItemDescription>
								{ __(
									'Access all block and document tools in a single place',
									'mark-bricks'
								) }
							</Menu.ItemDescription>
						</Menu.CheckboxItem>
						<Menu.CheckboxItem
							checked={ isFocusMode }
							onCheckedChange={ ( checked ) =>
								setPreference( 'core', 'focusMode', checked )
							}
						>
							<Menu.ItemLabel>
								{ __( 'Spotlight mode', 'mark-bricks' ) }
							</Menu.ItemLabel>
							<Menu.ItemDescription>
								{ __(
									'Focus on one block at a time',
									'mark-bricks'
								) }
							</Menu.ItemDescription>
						</Menu.CheckboxItem>
					</Menu.Group>
					<Menu.Separator />
					<Menu.Group>
						<Menu.GroupLabel>
							{ __( 'Editor', 'mark-bricks' ) }
						</Menu.GroupLabel>
						<Menu.RadioGroup
							value={ editorMode }
							onValueChange={ ( value ) =>
								onEditorModeChange( value as 'visual' | 'text' )
							}
						>
							<Menu.RadioItem
								value="visual"
								shortcut={
									editorMode !== 'visual'
										? toggleModeShortcut
										: undefined
								}
							>
								<Menu.ItemLabel>
									{ __( 'Visual editor', 'mark-bricks' ) }
								</Menu.ItemLabel>
							</Menu.RadioItem>
							<Menu.RadioItem
								value="text"
								shortcut={
									editorMode !== 'text'
										? toggleModeShortcut
										: undefined
								}
							>
								<Menu.ItemLabel>
									{ __( 'Code editor', 'mark-bricks' ) }
								</Menu.ItemLabel>
							</Menu.RadioItem>
						</Menu.RadioGroup>
					</Menu.Group>
					<Menu.Separator />
					<Menu.Group>
						<Menu.GroupLabel>
							{ __( 'Tools', 'mark-bricks' ) }
						</Menu.GroupLabel>
						<Menu.Item
							shortcut={ keyboardShortcutsShortcut }
							onClick={ () =>
								openModal( KEYBOARD_SHORTCUTS_MODAL_NAME )
							}
						>
							<Menu.ItemLabel>
								{ __( 'Keyboard shortcuts', 'mark-bricks' ) }
							</Menu.ItemLabel>
						</Menu.Item>
						<Menu.Item
							onClick={ () => openModal( ABOUT_MODAL_NAME ) }
						>
							<Menu.ItemLabel>
								{ __( 'About', 'mark-bricks' ) }
							</Menu.ItemLabel>
						</Menu.Item>
					</Menu.Group>
					<Menu.Separator />
					<Menu.Item
						onClick={ () => openModal( PREFERENCES_MODAL_NAME ) }
					>
						<Menu.ItemLabel>
							{ __( 'Preferences', 'mark-bricks' ) }
						</Menu.ItemLabel>
					</Menu.Item>
				</Menu.Popup>
			</Menu.Root>
		</Stack>
	);
}
