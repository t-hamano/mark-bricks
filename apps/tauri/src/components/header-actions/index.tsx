/**
 * External dependencies
 */
import { useEffect, useState } from 'react';

/**
 * WordPress dependencies
 */
import {
	Button,
	DropdownMenu,
	MenuGroup,
	MenuItem,
	MenuItemsChoice,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { store as interfaceStore } from '@wordpress/interface';
import { store as keyboardShortcutsStore } from '@wordpress/keyboard-shortcuts';
import { displayShortcut } from '@wordpress/keycodes';
import { PreferenceToggleMenuItem } from '@wordpress/preferences';
import { code, moreVertical } from '@wordpress/icons';
import { Stack } from '@wordpress/ui';

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
		toggleModeShortcut,
		keyboardShortcutsShortcut,
		isPreferencesOpened,
	} = useSelect( ( select ) => {
		const { getTabs, getActiveTabId } = select( tabsStore );
		const { getShortcutRepresentation } = select( keyboardShortcutsStore );
		const { isModalActive } = select( interfaceStore );
		const activeTab = getTabs().find( ( t ) => t.id === getActiveTabId() );
		return {
			isActiveTabDirty: !! activeTab?.isDirty,
			toggleModeShortcut:
				getShortcutRepresentation( 'mark-bricks/toggle-mode' ) ??
				undefined,
			keyboardShortcutsShortcut:
				getShortcutRepresentation( 'mark-bricks/keyboard-shortcuts' ) ??
				undefined,
			isPreferencesOpened: isModalActive( PREFERENCES_MODAL_NAME ),
		};
	}, [] );
	const { openModal } = useDispatch( interfaceStore );
	const [ isOptionsMenuOpen, setIsOptionsMenuOpen ] = useState( false );
	useEffect( () => {
		if ( isPreferencesOpened ) {
			setIsOptionsMenuOpen( false );
		}
	}, [ isPreferencesOpened ] );

	return (
		<Stack direction="row" align="center" gap="sm">
			<Button
				icon={ code }
				label={ __( 'Code editor', 'mark-bricks' ) }
				shortcut={ toggleModeShortcut }
				iconSize={ 20 }
				size="small"
				isPressed={ editorMode === 'text' }
				onClick={ () =>
					onEditorModeChange(
						editorMode === 'text' ? 'visual' : 'text'
					)
				}
				aria-pressed={ editorMode === 'text' }
			/>
			<Button
				variant="primary"
				size="small"
				onClick={ () => {
					saveActiveFile();
				} }
				disabled={ ! isActiveTabDirty }
				accessibleWhenDisabled
			>
				{ __( 'Save', 'mark-bricks' ) }
			</Button>
			<DropdownMenu
				icon={ moreVertical }
				label={ __( 'Options', 'mark-bricks' ) }
				open={ isOptionsMenuOpen }
				onToggle={ setIsOptionsMenuOpen }
				popoverProps={ { placement: 'bottom-end' } }
				toggleProps={ {
					tooltipPosition: 'bottom',
					size: 'small',
					iconSize: 20,
				} }
			>
				{ () => (
					<>
						<MenuGroup label={ __( 'Files', 'mark-bricks' ) }>
							<MenuItem
								shortcut={ displayShortcut.primary( 'n' ) }
								onClick={ () => {
									newFile();
									setIsOptionsMenuOpen( false );
								} }
							>
								{ __( 'New', 'mark-bricks' ) }
							</MenuItem>
							<MenuItem
								shortcut={ displayShortcut.primary( 'o' ) }
								onClick={ () => {
									openFile();
									setIsOptionsMenuOpen( false );
								} }
							>
								{ __( 'Open…', 'mark-bricks' ) }
							</MenuItem>
							<MenuItem
								shortcut={ displayShortcut.primary( 's' ) }
								onClick={ () => {
									saveActiveFile();
									setIsOptionsMenuOpen( false );
								} }
							>
								{ __( 'Save', 'mark-bricks' ) }
							</MenuItem>
							<MenuItem
								shortcut={ displayShortcut.primaryShift( 's' ) }
								onClick={ () => {
									saveActiveFileAs();
									setIsOptionsMenuOpen( false );
								} }
							>
								{ __( 'Save As…', 'mark-bricks' ) }
							</MenuItem>
						</MenuGroup>
						<MenuGroup label={ __( 'View', 'mark-bricks' ) }>
							<PreferenceToggleMenuItem
								scope="core"
								name="fixedToolbar"
								label={ __( 'Top toolbar', 'mark-bricks' ) }
								info={ __(
									'Access all block and document tools in a single place',
									'mark-bricks'
								) }
							/>
							<PreferenceToggleMenuItem
								scope="core"
								name="focusMode"
								label={ __( 'Spotlight mode', 'mark-bricks' ) }
								info={ __(
									'Focus on one block at a time',
									'mark-bricks'
								) }
								messageActivated={ __(
									'Spotlight mode activated.',
									'mark-bricks'
								) }
								messageDeactivated={ __(
									'Spotlight mode deactivated.',
									'mark-bricks'
								) }
							/>
						</MenuGroup>
						<MenuGroup label={ __( 'Editor', 'mark-bricks' ) }>
							<MenuItemsChoice
								choices={ [
									{
										value: 'visual',
										label: __(
											'Visual editor',
											'mark-bricks'
										),
										shortcut:
											editorMode !== 'visual'
												? toggleModeShortcut
												: undefined,
									},
									{
										value: 'text',
										label: __(
											'Code editor',
											'mark-bricks'
										),
										shortcut:
											editorMode !== 'text'
												? toggleModeShortcut
												: undefined,
									},
								] }
								value={ editorMode }
								onSelect={ ( value ) =>
									onEditorModeChange(
										value as 'visual' | 'text'
									)
								}
								onHover={ () => undefined }
							/>
						</MenuGroup>
						<MenuGroup label={ __( 'Tools', 'mark-bricks' ) }>
							<MenuItem
								shortcut={ keyboardShortcutsShortcut }
								onClick={ () => {
									openModal( KEYBOARD_SHORTCUTS_MODAL_NAME );
									setIsOptionsMenuOpen( false );
								} }
							>
								{ __( 'Keyboard shortcuts', 'mark-bricks' ) }
							</MenuItem>
							<MenuItem
								onClick={ () => {
									openModal( ABOUT_MODAL_NAME );
									setIsOptionsMenuOpen( false );
								} }
							>
								{ __( 'About', 'mark-bricks' ) }
							</MenuItem>
						</MenuGroup>
						<MenuGroup>
							<MenuItem
								onClick={ () => {
									openModal( PREFERENCES_MODAL_NAME );
									setIsOptionsMenuOpen( false );
								} }
							>
								{ __( 'Preferences', 'mark-bricks' ) }
							</MenuItem>
						</MenuGroup>
					</>
				) }
			</DropdownMenu>
		</Stack>
	);
}
