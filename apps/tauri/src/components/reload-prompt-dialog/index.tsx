/**
 * External dependencies
 */
import { useEffect } from 'react';

/**
 * WordPress dependencies
 */
import { useSelect } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';
import { AlertDialog, getWpCompatOverlaySlot } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import tabsStore from '../../store';
import { answerReloadPrompt } from '../../actions';

/**
 * Asks whether to reload a file that changed on disk while its tab has
 * unsaved changes. Prompts for several files are shown one at a time.
 */
export default function ReloadPromptDialog() {
	const { documentId, title } = useSelect( ( storeSelect ) => {
		const { getReloadPromptId, getTabs } = storeSelect( tabsStore );
		const id = getReloadPromptId();
		const tab = id
			? getTabs().find( ( t ) => t.documentId === id )
			: undefined;
		return { documentId: id, title: tab?.title ?? null };
	}, [] );

	// A tab closed while its prompt waits keeps nothing to reload.
	useEffect( () => {
		if ( documentId && title === null ) {
			answerReloadPrompt( documentId, false );
		}
	}, [ documentId, title ] );

	if ( ! documentId || title === null ) {
		return null;
	}

	return (
		<AlertDialog.Root
			// Remount for each prompt so a closing dialog cannot answer the next.
			key={ documentId }
			open
			onOpenChange={ ( open ) => {
				if ( ! open ) {
					answerReloadPrompt( documentId, false );
				}
			} }
			onConfirm={ () => answerReloadPrompt( documentId, true ) }
		>
			<AlertDialog.Popup
				intent="irreversible"
				title={ __( 'File changed', 'mark-bricks' ) }
				description={ sprintf(
					/* translators: %s: tab title. */
					__(
						'"%s" changed on disk. Reload it and discard your changes, or keep your version?',
						'mark-bricks'
					),
					title
				) }
				cancelButtonText={ __( 'Keep my version', 'mark-bricks' ) }
				confirmButtonText={ __( 'Reload', 'mark-bricks' ) }
				portal={
					<AlertDialog.Portal
						container={ getWpCompatOverlaySlot() }
					/>
				}
			/>
		</AlertDialog.Root>
	);
}
