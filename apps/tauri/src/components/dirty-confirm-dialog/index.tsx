/**
 * WordPress dependencies
 */
import { useDispatch, useSelect } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';
import { AlertDialog } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import { saveTab } from '../../actions';
import tabsStore from '../../store';

export default function DirtyConfirmDialog() {
	const { pendingTab } = useSelect( ( select ) => {
		const { getPendingCloseId, getTabs } = select( tabsStore );
		const id = getPendingCloseId();
		const tabs = getTabs();
		return {
			pendingTab: id ? tabs.find( ( t ) => t.id === id ) ?? null : null,
		};
	}, [] );

	const { closeTab, setPendingCloseId } = useDispatch( tabsStore );

	if ( ! pendingTab ) {
		return null;
	}

	const cancel = () => setPendingCloseId( null );

	const discard = () => {
		const id = pendingTab.id;
		setPendingCloseId( null );
		closeTab( id );
	};

	const save = async () => {
		const id = pendingTab.id;
		const ok = await saveTab( id );

		if ( ! ok ) {
			return;
		}

		setPendingCloseId( null );
		closeTab( id );
	};

	return (
		<AlertDialog.Root
			open
			onConfirm={ discard }
			onOpenChange={ ( nextOpen, eventDetails ) => {
				if ( nextOpen ) {
					return;
				}
				if ( eventDetails.reason === 'close-press' ) {
					save();
					return;
				}
				cancel();
			} }
		>
			<AlertDialog.Popup
				intent="irreversible"
				title={ __( 'Unsaved changes', 'mark-bricks' ) }
				description={ sprintf(
					/* translators: %s: tab title. */
					__(
						'"%s" has unsaved changes. Do you want to save before closing?',
						'mark-bricks'
					),
					pendingTab.title
				) }
				cancelButtonText={ __( 'Save', 'mark-bricks' ) }
				confirmButtonText={
					pendingTab.filePath
						? __( 'Discard changes', 'mark-bricks' )
						: __( 'Discard', 'mark-bricks' )
				}
			/>
		</AlertDialog.Root>
	);
}
