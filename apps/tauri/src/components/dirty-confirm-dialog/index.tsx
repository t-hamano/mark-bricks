/**
 * WordPress dependencies
 */
import { select, useDispatch, useSelect } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';
import { AlertDialog, getWpCompatOverlaySlot } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import tabsStore from '../../store';
import { closeTab } from '../../actions';

export default function DirtyConfirmDialog() {
	const { pendingTab } = useSelect( ( storeSelect ) => {
		const { getPendingCloseId, getTabs } = storeSelect( tabsStore );
		const id = getPendingCloseId();
		const tabs = getTabs();
		return {
			pendingTab: id
				? ( tabs.find( ( t ) => t.id === id ) ?? null )
				: null,
		};
	}, [] );

	const { setPendingCloseId } = useDispatch( tabsStore );

	if ( ! pendingTab ) {
		return null;
	}

	const cancel = () => {
		if ( select( tabsStore ).getPendingCloseId() === pendingTab.id ) {
			setPendingCloseId( null );
		}
	};

	const discard = async () => {
		const id = pendingTab.id;
		await closeTab( id );
	};

	return (
		<AlertDialog.Root
			open
			onOpenChange={ ( open ) => {
				if ( ! open ) {
					cancel();
				}
			} }
			onConfirm={ discard }
		>
			<AlertDialog.Popup
				intent="irreversible"
				title={ __( 'Unsaved changes', 'mark-bricks' ) }
				description={ sprintf(
					/* translators: %s: tab title. */
					__(
						'"%s" has unsaved changes. Do you want to discard them and close?',
						'mark-bricks'
					),
					pendingTab.title
				) }
				cancelButtonText={ __( 'Cancel', 'mark-bricks' ) }
				confirmButtonText={
					pendingTab.filePath
						? __( 'Discard changes', 'mark-bricks' )
						: __( 'Discard', 'mark-bricks' )
				}
				portal={
					<AlertDialog.Portal
						container={ getWpCompatOverlaySlot() }
					/>
				}
			/>
		</AlertDialog.Root>
	);
}
