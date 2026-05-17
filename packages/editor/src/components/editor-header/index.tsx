/**
 * External dependencies
 */
import type { ReactNode, RefObject } from 'react';

/**
 * WordPress dependencies
 */
import { BlockToolbar } from '@wordpress/block-editor';
import { Button, Popover } from '@wordpress/components';
import { useViewportMatch } from '@wordpress/compose';
import { useSelect, useDispatch } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { store as keyboardShortcutsStore } from '@wordpress/keyboard-shortcuts';
import { plus, undo, redo, listView } from '@wordpress/icons';
import { Stack } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import { store as editorStore } from '../../store';
import './style.scss';

type Props = {
	canUndo: boolean;
	canRedo: boolean;
	onUndo: () => void;
	onRedo: () => void;
	inserterToggleRef: RefObject< HTMLButtonElement | null >;
	listViewToggleRef: RefObject< HTMLButtonElement | null >;
	editorMode: 'visual' | 'text';
	fixedToolbar: boolean;
	headerActions?: ReactNode;
};

export function EditorHeader( {
	canUndo,
	canRedo,
	onUndo,
	onRedo,
	inserterToggleRef,
	listViewToggleRef,
	editorMode,
	fixedToolbar,
	headerActions,
}: Props ) {
	const { isListViewOpened, isInserterOpened, toggleListViewShortcut } =
		useSelect( ( select ) => {
			const {
				isListViewOpened: _isListViewOpened,
				isInserterOpened: _isInserterOpened,
			} = select( editorStore );
			const { getShortcutRepresentation } = select(
				keyboardShortcutsStore
			);

			return {
				isListViewOpened: _isListViewOpened(),
				isInserterOpened: _isInserterOpened(),
				toggleListViewShortcut:
					getShortcutRepresentation(
						'mark-bricks/toggle-list-view'
					) ?? undefined,
			};
		}, [] );
	const isMobileViewport = useViewportMatch( 'medium', '<' );
	const showFixedToolbar =
		fixedToolbar && editorMode === 'visual' && ! isMobileViewport;
	const { setIsListViewOpened, setIsInserterOpened } =
		useDispatch( editorStore );

	return (
		<Stack
			render={ <header /> }
			className="editor-header"
			align="center"
			justify="space-between"
			gap="sm"
		>
			<Stack direction="row" align="center" gap="sm">
				<Button
					ref={ inserterToggleRef }
					icon={ plus }
					label={
						isInserterOpened
							? __( 'Close Block Inserter', 'mark-bricks' )
							: __( 'Block Inserter', 'mark-bricks' )
					}
					iconSize={ 20 }
					size="small"
					variant="primary"
					isPressed={ isInserterOpened }
					onClick={ () => setIsInserterOpened( ! isInserterOpened ) }
					aria-expanded={ isInserterOpened }
					disabled={ editorMode === 'text' }
					className="editor-header__inserter-toggle"
				/>
				<Button
					icon={ undo }
					label={ __( 'Undo', 'mark-bricks' ) }
					iconSize={ 20 }
					size="small"
					onClick={ onUndo }
					disabled={ ! canUndo }
					accessibleWhenDisabled
				/>
				<Button
					icon={ redo }
					label={ __( 'Redo', 'mark-bricks' ) }
					iconSize={ 20 }
					size="small"
					onClick={ onRedo }
					disabled={ ! canRedo }
					accessibleWhenDisabled
				/>
				<Button
					ref={ listViewToggleRef }
					icon={ listView }
					label={
						isListViewOpened
							? __( 'Hide Document Overview', 'mark-bricks' )
							: __( 'Document Overview', 'mark-bricks' )
					}
					shortcut={ toggleListViewShortcut }
					iconSize={ 20 }
					size="small"
					isPressed={ isListViewOpened }
					onClick={ () => setIsListViewOpened( ! isListViewOpened ) }
					aria-expanded={ isListViewOpened }
					disabled={ editorMode === 'text' }
					accessibleWhenDisabled
				/>
			</Stack>
			{ showFixedToolbar && (
				<Stack className="editor-header__block-toolbar" align="center">
					<BlockToolbar
						// @ts-expect-error -- hideDragHandle is missing from the published BlockToolbar type defs.
						hideDragHandle
					/>
					<Popover.Slot name="block-toolbar" />
				</Stack>
			) }
			{ headerActions }
		</Stack>
	);
}
