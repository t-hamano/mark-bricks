/**
 * WordPress dependencies
 */
import { useDispatch, useSelect } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';
import { Button, Dialog } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import { saveTab } from '../../actions';
import tabsStore from '../../store';
import './style.scss';

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
		<Dialog.Root
			open
			disablePointerDismissal
			onOpenChange={ ( nextOpen ) => {
				if ( ! nextOpen ) {
					cancel();
				}
			} }
		>
			<Dialog.Popup size="small">
				<Dialog.Header>
					<Dialog.Title>
						{ __( 'Unsaved changes', 'mark-bricks' ) }
					</Dialog.Title>
				</Dialog.Header>
				<Dialog.Content>
					<Dialog.Description>
						{ sprintf(
							/* translators: %s: tab title. */
							__(
								'"%s" has unsaved changes. Do you want to save before closing?',
								'mark-bricks'
							),
							pendingTab.title
						) }
					</Dialog.Description>
				</Dialog.Content>
				<Dialog.Footer>
					<Button
						variant="minimal"
						tone="neutral"
						size="compact"
						onClick={ cancel }
					>
						{ __( 'Cancel', 'mark-bricks' ) }
					</Button>
					<Button
						className="dirty-confirm-dialog__discard"
						variant="minimal"
						size="compact"
						onClick={ discard }
					>
						{ pendingTab.filePath
							? __( 'Discard changes', 'mark-bricks' )
							: __( 'Discard', 'mark-bricks' ) }
					</Button>
					<Button size="compact" onClick={ save }>
						{ __( 'Save', 'mark-bricks' ) }
					</Button>
				</Dialog.Footer>
			</Dialog.Popup>
		</Dialog.Root>
	);
}
