/**
 * External dependencies
 */
import { useState } from 'react';
import { LOCALES, type Locale } from '@mark-bricks/editor';

/**
 * WordPress dependencies
 */
import { Button, SelectControl, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { Stack, Tabs } from '@wordpress/ui';

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

export function GeneralPanel( { settings, onChange }: Props ) {
	const [ isChecking, setIsChecking ] = useState( false );

	const onCheckClick = async () => {
		setIsChecking( true );
		try {
			await checkForUpdates();
		} finally {
			setIsChecking( false );
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
			</Stack>
		</Tabs.Panel>
	);
}
