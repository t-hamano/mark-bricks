/**
 * External dependencies
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type * as vscode from 'vscode';

/**
 * Internal dependencies
 */
import { DEFAULT_SETTINGS } from '../shared/settings';
import {
	ConfigurationTarget,
	Uri,
	configurationUpdate,
	resetVscode,
	setConfiguration,
} from './__mocks__/vscode';
import { readSettings, writeSetting } from './settings';

const scope = Uri.file( '/workspace/note.md' ) as unknown as vscode.Uri;

beforeEach( () => {
	resetVscode();
} );

describe( 'readSettings', () => {
	it( 'returns the defaults when nothing is set', () => {
		expect( readSettings( scope ) ).toEqual( DEFAULT_SETTINGS );
	} );

	it( 'returns valid values as set', () => {
		setConfiguration( 'markBricks.topToolbar', { globalValue: true } );
		setConfiguration( 'markBricks.contentWidth', { globalValue: 900 } );
		setConfiguration( 'markBricks.fontFamily', { globalValue: 'serif' } );
		setConfiguration( 'markBricks.theme', { globalValue: 'dark' } );

		expect( readSettings( scope ) ).toMatchObject( {
			topToolbar: true,
			contentWidth: 900,
			fontFamily: 'serif',
			theme: 'dark',
		} );
	} );

	it( 'clamps and rounds out-of-range numbers', () => {
		setConfiguration( 'markBricks.contentWidth', { globalValue: 5000 } );
		setConfiguration( 'markBricks.fontSize', { globalValue: 12.6 } );

		expect( readSettings( scope ) ).toMatchObject( {
			contentWidth: 1600,
			fontSize: 13,
		} );

		setConfiguration( 'markBricks.contentWidth', { globalValue: 10 } );
		expect( readSettings( scope ).contentWidth ).toBe( 400 );
	} );

	it( 'falls back to the defaults for values of the wrong type', () => {
		setConfiguration( 'markBricks.spotlightMode', { globalValue: 'yes' } );
		setConfiguration( 'markBricks.fontSize', { globalValue: NaN } );
		setConfiguration( 'markBricks.fontFamily', {
			globalValue: 'Comic Sans',
		} );
		setConfiguration( 'markBricks.theme', { globalValue: 'system' } );

		expect( readSettings( scope ) ).toMatchObject( {
			spotlightMode: DEFAULT_SETTINGS.spotlightMode,
			fontSize: DEFAULT_SETTINGS.fontSize,
			fontFamily: DEFAULT_SETTINGS.fontFamily,
			theme: DEFAULT_SETTINGS.theme,
		} );
	} );

	it( 'does not accept inherited object keys as font families', () => {
		setConfiguration( 'markBricks.fontFamily', {
			globalValue: 'toString',
		} );

		expect( readSettings( scope ).fontFamily ).toBe(
			DEFAULT_SETTINGS.fontFamily
		);
	} );
} );

describe( 'writeSetting', () => {
	it( 'writes to the user settings by default', async () => {
		await writeSetting( scope, 'topToolbar', true );

		expect( configurationUpdate ).toHaveBeenCalledWith(
			'topToolbar',
			true,
			ConfigurationTarget.Global
		);
	} );

	it( 'writes to the workspace when it defines the setting', async () => {
		setConfiguration( 'markBricks.topToolbar', {
			globalValue: false,
			workspaceValue: false,
		} );

		await writeSetting( scope, 'topToolbar', true );

		expect( configurationUpdate ).toHaveBeenCalledWith(
			'topToolbar',
			true,
			ConfigurationTarget.Workspace
		);
	} );

	it( 'writes to the workspace folder when it defines the setting', async () => {
		setConfiguration( 'markBricks.spotlightMode', {
			workspaceValue: false,
			workspaceFolderValue: false,
		} );

		await writeSetting( scope, 'spotlightMode', true );

		expect( configurationUpdate ).toHaveBeenCalledWith(
			'spotlightMode',
			true,
			ConfigurationTarget.WorkspaceFolder
		);
	} );
} );
