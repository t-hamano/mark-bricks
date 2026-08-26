/**
 * WordPress dependencies
 */
import { Modal } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';
import { Button, Stack, Text } from '@wordpress/ui';

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

	const dontSave = () => {
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
		<Modal
			title={ __( 'Unsaved changes', 'mark-bricks' ) }
			onRequestClose={ cancel }
			className="dirty-confirm-dialog"
			size="small"
		>
			<Stack direction="column" gap="md">
				<Text>
					{ sprintf(
						/* translators: %s: tab title. */
						__(
							'"%s" has unsaved changes. Do you want to save before closing?',
							'mark-bricks'
						),
						pendingTab.title
					) }
				</Text>
				<Stack gap="sm" justify="flex-end">
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
						onClick={ dontSave }
					>
						{ pendingTab.filePath
							? __( 'Discard changes', 'mark-bricks' )
							: __( 'Discard', 'mark-bricks' ) }
					</Button>
					<Button size="compact" onClick={ save }>
						{ __( 'Save', 'mark-bricks' ) }
					</Button>
				</Stack>
			</Stack>
		</Modal>
	);
}
