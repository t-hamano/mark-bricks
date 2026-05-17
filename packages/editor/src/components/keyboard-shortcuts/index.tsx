/**
 * External dependencies
 */
import { useEffect, type Dispatch, type SetStateAction } from 'react';

/**
 * WordPress dependencies
 */
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import {
	useShortcut,
	store as keyboardShortcutsStore,
} from '@wordpress/keyboard-shortcuts';
import { isAppleOS } from '@wordpress/keycodes';

/**
 * Internal dependencies
 */
import { store as editorStore } from '../../store';

type Props = {
	canUndo: boolean;
	canRedo: boolean;
	onUndo: () => void;
	onRedo: () => void;
	editorMode: 'visual' | 'text';
	onEditorModeChange?: Dispatch< SetStateAction< 'visual' | 'text' > >;
};

export function KeyboardShortcuts( {
	canUndo,
	canRedo,
	onUndo,
	onRedo,
	editorMode,
	onEditorModeChange,
}: Props ) {
	const isListViewOpened = useSelect(
		( select ) => select( editorStore ).isListViewOpened(),
		[]
	);
	const { setIsListViewOpened } = useDispatch( editorStore );
	const { registerShortcut, unregisterShortcut } = useDispatch(
		keyboardShortcutsStore
	);

	useEffect( () => {
		registerShortcut( {
			name: 'mark-bricks/undo',
			category: 'global',
			description: __( 'Undo your last changes.', 'mark-bricks' ),
			keyCombination: {
				modifier: 'primary',
				character: 'z',
			},
		} );

		registerShortcut( {
			name: 'mark-bricks/redo',
			category: 'global',
			description: __( 'Redo your last undo.', 'mark-bricks' ),
			keyCombination: {
				modifier: 'primaryShift',
				character: 'z',
			},
			// On non-Apple OS, Ctrl+Y is a common alias.
			aliases: isAppleOS()
				? []
				: [ { modifier: 'primary', character: 'y' } ],
		} );

		registerShortcut( {
			name: 'mark-bricks/toggle-mode',
			category: 'global',
			description: __(
				'Switch between the visual editor and the code editor.',
				'mark-bricks'
			),
			keyCombination: {
				modifier: 'secondary',
				character: 'm',
			},
		} );

		registerShortcut( {
			name: 'mark-bricks/toggle-list-view',
			category: 'global',
			description: __( 'Show or hide the List View.', 'mark-bricks' ),
			keyCombination: {
				modifier: 'access',
				character: 'o',
			},
		} );

		registerShortcut( {
			name: 'mark-bricks/keyboard-shortcuts',
			category: 'global',
			description: __(
				'Display these keyboard shortcuts.',
				'mark-bricks'
			),
			keyCombination: {
				modifier: 'access',
				character: 'h',
			},
		} );

		return () => {
			unregisterShortcut( 'mark-bricks/undo' );
			unregisterShortcut( 'mark-bricks/redo' );
			unregisterShortcut( 'mark-bricks/toggle-mode' );
			unregisterShortcut( 'mark-bricks/toggle-list-view' );
			unregisterShortcut( 'mark-bricks/keyboard-shortcuts' );
		};
	}, [ registerShortcut, unregisterShortcut ] );

	useShortcut(
		'mark-bricks/undo',
		( event ) => {
			event.preventDefault();
			onUndo();
		},
		{ isDisabled: ! canUndo }
	);

	useShortcut(
		'mark-bricks/redo',
		( event ) => {
			event.preventDefault();
			onRedo();
		},
		{ isDisabled: ! canRedo }
	);

	useShortcut( 'mark-bricks/toggle-mode', ( event ) => {
		event.preventDefault();
		onEditorModeChange?.( ( mode ) =>
			mode === 'visual' ? 'text' : 'visual'
		);
	} );

	useShortcut(
		'mark-bricks/toggle-list-view',
		( event ) => {
			event.preventDefault();
			setIsListViewOpened( ! isListViewOpened );
		},
		{ isDisabled: editorMode === 'text' }
	);

	return null;
}
