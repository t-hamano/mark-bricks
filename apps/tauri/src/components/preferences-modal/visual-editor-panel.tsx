/**
 * External dependencies
 */
import type { EditorThemePreference } from '@mark-bricks/editor';

/**
 * WordPress dependencies
 */
import { RangeControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { SelectControl, Stack, SwitchControl, Text } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import {
	DEFAULT_PREFERENCES,
	getFontFamilyOptions,
	getThemeOptions,
} from '../../preferences/constants';

const DEFAULT_EDITOR_STYLES = DEFAULT_PREFERENCES[ 'mark-bricks' ].editorStyles;

export type VisualEditorSettings = {
	theme: EditorThemePreference;
	spellCheck: boolean;
	showListViewByDefault: boolean;
	showBlockBreadcrumbs: boolean;
	contentWidth: number;
	fontSize: number;
	fontFamily: string;
};

type Props = {
	settings: VisualEditorSettings;
	onChange: ( edits: Partial< VisualEditorSettings > ) => void;
};

export function VisualEditorPanel( { settings, onChange }: Props ) {
	const themeItems = getThemeOptions();
	const fontFamilyItems = getFontFamilyOptions();

	return (
		<Stack direction="column" gap="xl">
			<Stack direction="column" gap="md">
				<Text variant="heading-xl" render={ <h2 /> }>
					{ __( 'Settings', 'mark-bricks' ) }
				</Text>
				<SelectControl
					size="compact"
					label={ __( 'Theme', 'mark-bricks' ) }
					items={ themeItems }
					value={
						themeItems.find(
							( item ) => item.value === settings.theme
						) ?? null
					}
					isItemEqualToValue={ ( a, b ) => a.value === b.value }
					onValueChange={ ( item ) => {
						if ( item ) {
							onChange( {
								theme: item.value as EditorThemePreference,
							} );
						}
					} }
				/>
				<SwitchControl
					label={ __( 'Spell check', 'mark-bricks' ) }
					checked={ settings.spellCheck }
					onCheckedChange={ ( value ) =>
						onChange( { spellCheck: value } )
					}
					description={ __(
						'Highlight misspelled words while editing.',
						'mark-bricks'
					) }
				/>
				<SwitchControl
					label={ __( 'Always open List View', 'mark-bricks' ) }
					checked={ settings.showListViewByDefault }
					onCheckedChange={ ( value ) =>
						onChange( { showListViewByDefault: value } )
					}
					description={ __(
						'Opens the List View panel by default.',
						'mark-bricks'
					) }
				/>
				<SwitchControl
					label={ __( 'Show block breadcrumbs', 'mark-bricks' ) }
					checked={ settings.showBlockBreadcrumbs }
					onCheckedChange={ ( value ) =>
						onChange( { showBlockBreadcrumbs: value } )
					}
					description={ __(
						'Displays the block hierarchy trail at the bottom of the editor.',
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
					resetFallbackValue={ DEFAULT_EDITOR_STYLES.contentWidth }
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
					items={ fontFamilyItems }
					value={
						fontFamilyItems.find(
							( item ) =>
								( item.value ?? '' ) === settings.fontFamily
						) ?? null
					}
					isItemEqualToValue={ ( a, b ) => a.value === b.value }
					onValueChange={ ( item ) => {
						if ( item ) {
							onChange( { fontFamily: item.value ?? '' } );
						}
					} }
					description={ __(
						'Typeface used for the content area.',
						'mark-bricks'
					) }
				/>
			</Stack>
		</Stack>
	);
}
