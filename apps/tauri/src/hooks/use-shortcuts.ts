/**
 * External dependencies
 */
import { useEffect } from 'react';

/**
 * WordPress dependencies
 */
import { dispatch, select, useDispatch } from '@wordpress/data';
import { store as interfaceStore } from '@wordpress/interface';
import { store as keyboardShortcutsStore } from '@wordpress/keyboard-shortcuts';
import type { WPKeycodeModifier } from '@wordpress/keycodes';
import { __ } from '@wordpress/i18n';
import { isAppleOS } from '@wordpress/keycodes';

/**
 * Internal dependencies
 */
import {
	newFile,
	openFile,
	requestCloseActiveTab,
	saveActiveFile,
	saveActiveFileAs,
} from '../actions';
import { KEYBOARD_SHORTCUTS_MODAL_NAME } from '../components/keyboard-shortcuts-modal';

type ShortcutDef = {
	name: string;
	description: string;
	modifier: WPKeycodeModifier;
	character: string;
	key: string;
	shift?: boolean;
	handler: () => void;
};

const SHORTCUTS: ShortcutDef[] = [
	{
		name: 'mark-bricks/new-file',
		description: __( 'Create a new file.', 'mark-bricks' ),
		modifier: 'primary',
		character: 'n',
		key: 'n',
		handler: () => newFile(),
	},
	{
		name: 'mark-bricks/open-file',
		description: __( 'Open a file.', 'mark-bricks' ),
		modifier: 'primary',
		character: 'o',
		key: 'o',
		handler: () => void openFile(),
	},
	{
		name: 'mark-bricks/save-file',
		description: __( 'Save the active file.', 'mark-bricks' ),
		modifier: 'primary',
		character: 's',
		key: 's',
		handler: () => void saveActiveFile(),
	},
	{
		name: 'mark-bricks/save-file-as',
		description: __(
			'Save the active file under a new name.',
			'mark-bricks'
		),
		modifier: 'primaryShift',
		character: 's',
		key: 's',
		shift: true,
		handler: () => void saveActiveFileAs(),
	},
	{
		name: 'mark-bricks/close-tab',
		description: __( 'Close the active tab.', 'mark-bricks' ),
		modifier: 'primary',
		character: 'w',
		key: 'w',
		handler: () => requestCloseActiveTab(),
	},
];

function toggleKeyboardShortcutsModal() {
	const isOpen = select( interfaceStore ).isModalActive(
		KEYBOARD_SHORTCUTS_MODAL_NAME
	);
	if ( isOpen ) {
		dispatch( interfaceStore ).closeModal();
	} else {
		dispatch( interfaceStore ).openModal( KEYBOARD_SHORTCUTS_MODAL_NAME );
	}
}

function handleKeyDown( event: KeyboardEvent ) {
	const isMac = isAppleOS();
	const primary = isMac ? event.metaKey : event.ctrlKey;
	const secondary = isMac ? event.ctrlKey : event.metaKey;
	const key = event.key.toLowerCase();

	// `access` modifier: Ctrl+Alt on Apple OS, Shift+Alt on others.
	const isAccess = isMac
		? event.ctrlKey && event.altKey && ! event.metaKey && ! event.shiftKey
		: event.shiftKey && event.altKey && ! event.ctrlKey && ! event.metaKey;
	if ( isAccess && key === 'h' ) {
		event.preventDefault();
		event.stopPropagation();
		toggleKeyboardShortcutsModal();
		return;
	}

	if ( ! primary || event.altKey || secondary ) {
		return;
	}
	const match = SHORTCUTS.find(
		( s ) => s.key === key && Boolean( s.shift ) === event.shiftKey
	);
	if ( ! match ) {
		return;
	}
	event.preventDefault();
	event.stopPropagation();
	match.handler();
}

export default function useShortcuts() {
	const { registerShortcut, unregisterShortcut } = useDispatch(
		keyboardShortcutsStore
	);

	useEffect( () => {
		SHORTCUTS.forEach( ( s ) => {
			registerShortcut( {
				name: s.name,
				category: 'file',
				description: s.description,
				keyCombination: {
					modifier: s.modifier,
					character: s.character,
				},
			} );
		} );
		return () => {
			SHORTCUTS.forEach( ( s ) => {
				unregisterShortcut( s.name );
			} );
		};
	}, [ registerShortcut, unregisterShortcut ] );

	useEffect( () => {
		document.addEventListener( 'keydown', handleKeyDown, {
			capture: true,
		} );
		return () => {
			document.removeEventListener( 'keydown', handleKeyDown, {
				capture: true,
			} );
		};
	}, [] );
}
