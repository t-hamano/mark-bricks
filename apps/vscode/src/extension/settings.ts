/**
 * External dependencies
 */
import {
	FONT_FAMILY_STACKS,
	type FontFamily,
} from '@mark-bricks/editor/font-families';
import * as vscode from 'vscode';

/**
 * Internal dependencies
 */
import {
	DEFAULT_SETTINGS,
	type Settings,
	type WritableSettingKey,
} from '../shared/settings';

export const CONFIGURATION_SECTION = 'markBricks';

function clamp( value: unknown, min: number, max: number, fallback: number ) {
	return typeof value === 'number' && Number.isFinite( value )
		? Math.min( max, Math.max( min, Math.round( value ) ) )
		: fallback;
}

function toBoolean( value: unknown, fallback: boolean ): boolean {
	return typeof value === 'boolean' ? value : fallback;
}

/**
 * Reads the settings that apply to a document. Values hand-written into
 * `settings.json` bypass the schema, so anything out of range or not in an
 * enum falls back to its default.
 *
 * @param scope The document the settings apply to.
 */
export function readSettings( scope: vscode.Uri ): Settings {
	const config = vscode.workspace.getConfiguration(
		CONFIGURATION_SECTION,
		scope
	);
	const fontFamily = config.get< unknown >( 'fontFamily' );

	return {
		showListViewByDefault: toBoolean(
			config.get( 'showListViewByDefault' ),
			DEFAULT_SETTINGS.showListViewByDefault
		),
		showBlockBreadcrumbs: toBoolean(
			config.get( 'showBlockBreadcrumbs' ),
			DEFAULT_SETTINGS.showBlockBreadcrumbs
		),
		topToolbar: toBoolean(
			config.get( 'topToolbar' ),
			DEFAULT_SETTINGS.topToolbar
		),
		spotlightMode: toBoolean(
			config.get( 'spotlightMode' ),
			DEFAULT_SETTINGS.spotlightMode
		),
		contentWidth: clamp(
			config.get( 'contentWidth' ),
			400,
			1600,
			DEFAULT_SETTINGS.contentWidth
		),
		fontSize: clamp(
			config.get( 'fontSize' ),
			10,
			24,
			DEFAULT_SETTINGS.fontSize
		),
		fontFamily:
			typeof fontFamily === 'string' &&
			Object.prototype.hasOwnProperty.call(
				FONT_FAMILY_STACKS,
				fontFamily
			)
				? ( fontFamily as FontFamily )
				: DEFAULT_SETTINGS.fontFamily,
	};
}

/**
 * Writes a setting at the most specific level that already defines it, so
 * the change is not shadowed by a workspace or folder value.
 *
 * @param scope The document the setting is changed from.
 * @param key   Setting key without the section prefix.
 * @param value New value.
 */
export async function writeSetting(
	scope: vscode.Uri,
	key: WritableSettingKey,
	value: boolean
): Promise< void > {
	const config = vscode.workspace.getConfiguration(
		CONFIGURATION_SECTION,
		scope
	);
	const inspected = config.inspect( key );

	let target = vscode.ConfigurationTarget.Global;
	if ( inspected?.workspaceFolderValue !== undefined ) {
		target = vscode.ConfigurationTarget.WorkspaceFolder;
	} else if ( inspected?.workspaceValue !== undefined ) {
		target = vscode.ConfigurationTarget.Workspace;
	}
	await config.update( key, value, target );
}
