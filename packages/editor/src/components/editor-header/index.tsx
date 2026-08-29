/**
 * External dependencies
 */
import type { ReactNode, RefObject } from 'react';

/**
 * WordPress dependencies
 */
import { BlockToolbar } from '@wordpress/block-editor';
import { Popover } from '@wordpress/components';
import { useViewportMatch } from '@wordpress/compose';
import { useSelect, useDispatch } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { plus, undo, redo, listView } from '@wordpress/icons';
import { IconButton, Stack } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import { useKeyboardShortcut } from '../keyboard-shortcuts/hooks';
import { store as editorStore } from '../../store';
import './style.scss';

type Props = {
	canUndo: boolean;
	canRedo: boolean;
	onUndo: () => void;
	onRedo: () => void;
	showUndoRedo: boolean;
	inserterToggleRef: RefObject< HTMLButtonElement >;
	listViewToggleRef: RefObject< HTMLButtonElement >;
	editorMode: 'visual' | 'text';
	fixedToolbar: boolean;
	headerActions?: ReactNode;
};

export function EditorHeader( {
	canUndo,
	canRedo,
	onUndo,
	onRedo,
	showUndoRedo,
	inserterToggleRef,
	listViewToggleRef,
	editorMode,
	fixedToolbar,
	headerActions,
}: Props ) {
	const { isListViewOpened, isInserterOpened } = useSelect( ( select ) => {
		const {
			isListViewOpened: _isListViewOpened,
			isInserterOpened: _isInserterOpened,
		} = select( editorStore );

		return {
			isListViewOpened: _isListViewOpened(),
			isInserterOpened: _isInserterOpened(),
		};
	}, [] );
	const toggleListViewShortcut = useKeyboardShortcut(
		'mark-bricks/toggle-list-view'
	);
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
				<IconButton
					ref={ inserterToggleRef }
					icon={ plus }
					label={
						isInserterOpened
							? __( 'Close Block Inserter', 'mark-bricks' )
							: __( 'Block Inserter', 'mark-bricks' )
					}
					size="compact"
					onClick={ () => setIsInserterOpened( ! isInserterOpened ) }
					aria-expanded={ isInserterOpened }
					aria-pressed={ isInserterOpened }
					disabled={ editorMode === 'text' }
					className="editor-header__inserter-toggle"
				/>
				{ showUndoRedo && (
					<>
						<IconButton
							icon={ undo }
							label={ __( 'Undo', 'mark-bricks' ) }
							variant="minimal"
							tone="neutral"
							size="compact"
							onClick={ onUndo }
							disabled={ ! canUndo }
						/>
						<IconButton
							icon={ redo }
							label={ __( 'Redo', 'mark-bricks' ) }
							variant="minimal"
							tone="neutral"
							size="compact"
							onClick={ onRedo }
							disabled={ ! canRedo }
						/>
					</>
				) }
				<IconButton
					ref={ listViewToggleRef }
					icon={ listView }
					label={
						isListViewOpened
							? __( 'Hide Document Overview', 'mark-bricks' )
							: __( 'Document Overview', 'mark-bricks' )
					}
					shortcut={ toggleListViewShortcut }
					variant="minimal"
					tone="neutral"
					size="compact"
					onClick={ () => setIsListViewOpened( ! isListViewOpened ) }
					aria-expanded={ isListViewOpened }
					aria-pressed={ isListViewOpened }
					disabled={ editorMode === 'text' }
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
