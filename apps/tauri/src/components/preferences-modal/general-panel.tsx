/**
 * External dependencies
 */
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { LOCALES, type Locale } from '@mark-bricks/editor';

/**
 * WordPress dependencies
 */
import {
	Button,
	Notice,
	SelectControl,
	ToggleControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { Stack, Tabs, Text } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import { checkForUpdates } from '../../hooks/use-auto-updater';

export type GeneralSettings = {
	locale: Locale;
	checkUpdatesAuto: boolean;
};

type Props = {
	settings: GeneralSettings;
	onChange: ( edits: Partial< GeneralSettings > ) => void;
};

type AssociateStatus =
	| { kind: 'idle' }
	| { kind: 'busy' }
	| { kind: 'set' }
	| { kind: 'declined' }
	| { kind: 'opened-settings' }
	| { kind: 'unsupported' }
	| { kind: 'error'; message: string };

export function GeneralPanel( { settings, onChange }: Props ) {
	const [ isChecking, setIsChecking ] = useState( false );
	const [ associateStatus, setAssociateStatus ] = useState< AssociateStatus >(
		{
			kind: 'idle',
		}
	);

	const onCheckClick = async () => {
		setIsChecking( true );
		try {
			await checkForUpdates();
		} finally {
			setIsChecking( false );
		}
	};

	const onAssociateClick = async () => {
		setAssociateStatus( { kind: 'busy' } );
		try {
			const result = await invoke< string >(
				'set_as_default_markdown_handler'
			);
			if (
				result === 'set' ||
				result === 'declined' ||
				result === 'opened-settings' ||
				result === 'unsupported'
			) {
				setAssociateStatus( { kind: result } );
			} else {
				setAssociateStatus( { kind: 'idle' } );
			}
		} catch ( error ) {
			setAssociateStatus( {
				kind: 'error',
				message: String( error ),
			} );
		}
	};

	return (
		<Tabs.Panel value="general">
			<Stack direction="column" gap="xl">
				<SelectControl
					size="compact"
					label={ __( 'Language', 'mark-bricks' ) }
					value={ settings.locale }
					options={ LOCALES.map( ( l ) => ( {
						value: l.code,
						label: l.name,
					} ) ) }
					onChange={ ( value ) =>
						onChange( { locale: value as Locale } )
					}
					help={ __(
						'Restart the app to apply the new language.',
						'mark-bricks'
					) }
				/>
				<Stack direction="column" gap="lg">
					<ToggleControl
						label={ __(
							'Check updates automatically',
							'mark-bricks'
						) }
						checked={ settings.checkUpdatesAuto }
						onChange={ ( value ) =>
							onChange( { checkUpdatesAuto: value } )
						}
					/>
					<Button
						variant="secondary"
						size="compact"
						isBusy={ isChecking }
						disabled={ isChecking }
						onClick={ onCheckClick }
						accessibleWhenDisabled
					>
						{ isChecking
							? __( 'Checking…', 'mark-bricks' )
							: __( 'Check for updates', 'mark-bricks' ) }
					</Button>
				</Stack>
				<Stack direction="column" gap="md">
					<Text variant="heading-xl" render={ <h2 /> }>
						{ __( 'File associations', 'mark-bricks' ) }
					</Text>
					<Button
						variant="secondary"
						size="compact"
						isBusy={ associateStatus.kind === 'busy' }
						disabled={ associateStatus.kind === 'busy' }
						onClick={ onAssociateClick }
						accessibleWhenDisabled
					>
						{ __(
							'Set as default for Markdown files',
							'mark-bricks'
						) }
					</Button>
					{ associateStatus.kind === 'set' && (
						<Notice
							status="success"
							isDismissible={ false }
							politeness="polite"
						>
							{ __(
								'MarkBricks is now the default app for Markdown files.',
								'mark-bricks'
							) }
						</Notice>
					) }
					{ associateStatus.kind === 'opened-settings' && (
						<Notice
							status="info"
							isDismissible={ false }
							politeness="polite"
						>
							{ __(
								'Opened the system settings. Select MarkBricks under the .md file type to finish.',
								'mark-bricks'
							) }
						</Notice>
					) }
					{ associateStatus.kind === 'unsupported' && (
						<Notice
							status="warning"
							isDismissible={ false }
							politeness="polite"
						>
							{ __(
								'This platform does not support setting the default app from inside MarkBricks. Please configure it from your system file manager.',
								'mark-bricks'
							) }
						</Notice>
					) }
					{ associateStatus.kind === 'error' && (
						<Notice
							status="error"
							isDismissible={ false }
							politeness="polite"
						>
							{ associateStatus.message }
						</Notice>
					) }
				</Stack>
			</Stack>
		</Tabs.Panel>
	);
}
