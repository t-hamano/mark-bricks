/**
 * External dependencies
 */
import { useState } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';

/**
 * WordPress dependencies
 */
import { Button, Modal } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { store as interfaceStore } from '@wordpress/interface';
import { Badge, Link, Stack, Text } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import { bugs } from '../../../package.json';
import { checkForUpdates } from '../../hooks/use-auto-updater';
import appIcon from '../../assets/app-icon.png';

export const ABOUT_MODAL_NAME = 'mark-bricks/about';

const REPORT_ISSUE_URL = bugs.url;

type Props = {
	name: string;
	version: string;
};

export default function AboutModal( { name, version }: Props ) {
	const { closeModal } = useDispatch( interfaceStore );
	const [ isChecking, setIsChecking ] = useState( false );

	const isOpened = useSelect(
		( select ) =>
			select( interfaceStore ).isModalActive( ABOUT_MODAL_NAME ),
		[]
	);

	if ( ! isOpened ) {
		return null;
	}

	const onCheckClick = async () => {
		setIsChecking( true );
		try {
			await checkForUpdates();
		} finally {
			setIsChecking( false );
		}
	};

	return (
		<Modal
			title={ __( 'About', 'mark-bricks' ) }
			onRequestClose={ () => closeModal() }
			className="about-modal"
		>
			<Stack direction="column" align="stretch" gap="3xl">
				<Stack direction="column" align="center" gap="lg">
					<img
						src={ appIcon }
						alt={ name }
						width={ 96 }
						height={ 96 }
					/>
					<Stack
						direction="row"
						justify="center"
						align="center"
						gap="lg"
					>
						<Text variant="heading-2xl">{ name }</Text>
						{ version && (
							<Badge intent="informational">{ `v${ version }` }</Badge>
						) }
					</Stack>
				</Stack>
				<Stack
					direction="row"
					justify="space-between"
					align="center"
					gap="sm"
				>
					<Button
						variant="secondary"
						size="small"
						isBusy={ isChecking }
						disabled={ isChecking }
						onClick={ onCheckClick }
						accessibleWhenDisabled
					>
						{ isChecking
							? __( 'Checking…', 'mark-bricks' )
							: __( 'Check for updates', 'mark-bricks' ) }
					</Button>
					<Link
						href={ REPORT_ISSUE_URL }
						openInNewTab
						onClick={ ( event ) => {
							event.preventDefault();
							openUrl( REPORT_ISSUE_URL );
						} }
					>
						{ __( 'Report an issue', 'mark-bricks' ) }
					</Link>
				</Stack>
			</Stack>
		</Modal>
	);
}
