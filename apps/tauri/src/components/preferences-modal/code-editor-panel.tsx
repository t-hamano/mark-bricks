/**
 * External dependencies
 */
import type { CodeEditorSettings } from '@mark-bricks/editor';

/**
 * WordPress dependencies
 */
import {
	RangeControl,
	SelectControl,
	ToggleControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { Button, Stack, Tabs, Text } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import {
	DEFAULT_PREFERENCES,
	getThemeOptions,
} from '../../preferences/constants';

const DEFAULT_CODE_EDITOR_STYLES =
	DEFAULT_PREFERENCES[ 'mark-bricks' ].codeEditor;

type Props = {
	settings: CodeEditorSettings;
	onChange: ( edits: Partial< CodeEditorSettings > ) => void;
};

export function CodeEditorPanel( { settings, onChange }: Props ) {
	return (
		<Tabs.Panel value="code-editor">
			<Stack direction="column" gap="3xl" align="flex-start">
				<Stack direction="column" gap="md">
					<Text variant="heading-xl" render={ <h2 /> }>
						{ __( 'Settings', 'mark-bricks' ) }
					</Text>
					<SelectControl
						size="compact"
						label={ __( 'Theme', 'mark-bricks' ) }
						value={ settings.theme }
						options={ getThemeOptions() }
						onChange={ ( value ) =>
							onChange( {
								theme: value as CodeEditorSettings[ 'theme' ],
							} )
						}
					/>
					<RangeControl
						label={ __( 'Font size', 'mark-bricks' ) }
						min={ 8 }
						max={ 48 }
						value={ settings.fontSize }
						onChange={ ( value ) =>
							onChange( { fontSize: Number( value ) } )
						}
						resetFallbackValue={
							DEFAULT_CODE_EDITOR_STYLES.fontSize
						}
						allowReset
					/>
					<RangeControl
						label={ __( 'Tab size', 'mark-bricks' ) }
						min={ 1 }
						max={ 8 }
						value={ settings.tabSize }
						onChange={ ( value ) =>
							onChange( { tabSize: Number( value ) } )
						}
						resetFallbackValue={
							DEFAULT_CODE_EDITOR_STYLES.tabSize
						}
						allowReset
					/>
					<ToggleControl
						label={ __( 'Show line numbers', 'mark-bricks' ) }
						checked={ settings.showLineNumbers }
						onChange={ ( showLineNumbers ) =>
							onChange( { showLineNumbers } )
						}
					/>
				</Stack>
				<Button
					variant="outline"
					size="compact"
					onClick={ () =>
						onChange(
							DEFAULT_PREFERENCES[ 'mark-bricks' ].codeEditor
						)
					}
				>
					{ __( 'Restore default settings', 'mark-bricks' ) }
				</Button>
			</Stack>
		</Tabs.Panel>
	);
}
