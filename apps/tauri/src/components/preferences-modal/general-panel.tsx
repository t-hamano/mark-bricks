/**
 * External dependencies
 */
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { LOCALES, type Locale } from '@mark-bricks/editor';

/**
 * WordPress dependencies
 */
import { ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import {
	Button,
	Notice,
	SelectControl,
	Stack,
	Tabs,
	Text,
} from '@wordpress/ui';

/**
 * Internal dependencies
 */
import { checkForUpdates } from '../../hooks/use-auto-updater';

const LOCALE_ITEMS = LOCALES.map( ( locale ) => ( {
	value: locale.code,
	label: locale.name,
} ) );

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
		<Tabs.Panel value="general" tabIndex={ -1 }>
			<Stack direction="column" gap="xl">
				<Stack direction="column" gap="md">
					<Text variant="heading-xl" render={ <h2 /> }>
						{ __( 'Language', 'mark-bricks' ) }
					</Text>
					<SelectControl
						hideLabelFromVision
						size="compact"
						label={ __( 'Language', 'mark-bricks' ) }
						items={ LOCALE_ITEMS }
						value={
							LOCALE_ITEMS.find(
								( item ) => item.value === settings.locale
							) ?? null
						}
						isItemEqualToValue={ ( a, b ) => a.value === b.value }
						onValueChange={ ( item ) => {
							if ( item ) {
								onChange( { locale: item.value as Locale } );
							}
						} }
						description={ __(
							'Restart the app to apply the new language.',
							'mark-bricks'
						) }
					/>
				</Stack>
				<Stack direction="column" gap="md" align="flex-start">
					<Text variant="heading-xl" render={ <h2 /> }>
						{ __( 'Update', 'mark-bricks' ) }
					</Text>
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
						variant="outline"
						size="compact"
						loading={ isChecking }
						loadingAnnouncement={ __( 'Checking…', 'mark-bricks' ) }
						disabled={ isChecking }
						onClick={ onCheckClick }
					>
						{ __( 'Check for updates', 'mark-bricks' ) }
					</Button>
				</Stack>
				<Stack direction="column" gap="md" align="flex-start">
					<Text variant="heading-xl" render={ <h2 /> }>
						{ __( 'File associations', 'mark-bricks' ) }
					</Text>
					<Button
						variant="outline"
						size="compact"
						loading={ associateStatus.kind === 'busy' }
						loadingAnnouncement={ __( 'Working…', 'mark-bricks' ) }
						disabled={ associateStatus.kind === 'busy' }
						onClick={ onAssociateClick }
					>
						{ __(
							'Set as default for Markdown files',
							'mark-bricks'
						) }
					</Button>
					{ associateStatus.kind === 'set' && (
						<Notice.Root intent="success">
							<Notice.Description>
								{ __(
									'MarkBricks is now the default app for Markdown files.',
									'mark-bricks'
								) }
							</Notice.Description>
						</Notice.Root>
					) }
					{ associateStatus.kind === 'unsupported' && (
						<Notice.Root intent="warning">
							<Notice.Description>
								{ __(
									'This platform does not support setting the default app from inside MarkBricks. Please configure it from your system file manager.',
									'mark-bricks'
								) }
							</Notice.Description>
						</Notice.Root>
					) }
					{ associateStatus.kind === 'error' && (
						<Notice.Root intent="error">
							<Notice.Description>
								{ associateStatus.message }
							</Notice.Description>
						</Notice.Root>
					) }
				</Stack>
			</Stack>
		</Tabs.Panel>
	);
}
