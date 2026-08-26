/**
 * WordPress dependencies
 */
import {
	RangeControl,
	SelectControl,
	ToggleControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { Stack, Tabs, Text } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import {
	DEFAULT_PREFERENCES,
	getFontFamilyOptions,
} from '../../preferences/constants';

const DEFAULT_EDITOR_STYLES = DEFAULT_PREFERENCES[ 'mark-bricks' ].editorStyles;

export type VisualEditorSettings = {
	spellCheck: boolean;
	showListViewByDefault: boolean;
	contentWidth: number;
	fontSize: number;
	fontFamily: string;
};

type Props = {
	settings: VisualEditorSettings;
	onChange: ( edits: Partial< VisualEditorSettings > ) => void;
};

export function VisualEditorPanel( { settings, onChange }: Props ) {
	return (
		<Tabs.Panel value="visual-editor">
			<Stack direction="column" gap="xl">
				<Stack direction="column" gap="md">
					<Text variant="heading-xl" render={ <h2 /> }>
						{ __( 'Settings', 'mark-bricks' ) }
					</Text>
					<ToggleControl
						label={ __( 'Spell check', 'mark-bricks' ) }
						checked={ settings.spellCheck }
						onChange={ ( value ) =>
							onChange( { spellCheck: value } )
						}
						help={ __(
							'Highlight misspelled words while editing.',
							'mark-bricks'
						) }
					/>
					<ToggleControl
						label={ __( 'Always open List View', 'mark-bricks' ) }
						checked={ settings.showListViewByDefault }
						onChange={ ( value ) =>
							onChange( { showListViewByDefault: value } )
						}
						help={ __(
							'Opens the List View panel by default.',
							'mark-bricks'
						) }
					/>
				</Stack>
				<Stack direction="column" gap="md">
					<Text variant="heading-xl" render={ <h2 /> }>
						{ __( 'Editor styles', 'mark-bricks' ) }
					</Text>
					<RangeControl
						label={ __( 'Content width', 'mark-bricks' ) }
						value={ settings.contentWidth }
						min={ 400 }
						max={ 1600 }
						step={ 10 }
						allowReset
						resetFallbackValue={
							DEFAULT_EDITOR_STYLES.contentWidth
						}
						onChange={ ( value ) => {
							if ( value !== undefined ) {
								onChange( { contentWidth: value } );
							}
						} }
						help={ __(
							'Maximum width of the content area, in pixels.',
							'mark-bricks'
						) }
					/>
					<RangeControl
						label={ __( 'Font size', 'mark-bricks' ) }
						value={ settings.fontSize }
						min={ 10 }
						max={ 24 }
						step={ 1 }
						allowReset
						resetFallbackValue={ DEFAULT_EDITOR_STYLES.fontSize }
						onChange={ ( value ) => {
							if ( value !== undefined ) {
								onChange( { fontSize: value } );
							}
						} }
						help={ __(
							'Base font size of the content area, in pixels.',
							'mark-bricks'
						) }
					/>
					<SelectControl
						size="compact"
						label={ __( 'Font family', 'mark-bricks' ) }
						value={ settings.fontFamily }
						options={ getFontFamilyOptions() }
						onChange={ ( value ) =>
							onChange( { fontFamily: value } )
						}
						help={ __(
							'Typeface used for the content area.',
							'mark-bricks'
						) }
					/>
				</Stack>
			</Stack>
		</Tabs.Panel>
	);
}
