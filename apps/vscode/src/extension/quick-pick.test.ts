/**
 * External dependencies
 */
import { beforeEach, describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import {
	TabInputCustom,
	TabInputText,
	commands,
	createDocument,
	resetVscode,
	setActiveTab,
	window,
} from './__mocks__/vscode';
import { getCommandItems, showCommandQuickPick } from './quick-pick';

const EXTENSION_ID = 'aki-hamano.mark-bricks-vscode';
const DECK = '---\nmarp: true\n---\n\n# One\n';

function listedCommands() {
	return getCommandItems( EXTENSION_ID ).map( ( item ) => item.command );
}

beforeEach( () => {
	resetVscode();
} );

describe( 'getCommandItems', () => {
	it( 'offers the visual editor from the text editor', () => {
		const document = createDocument( '/docs/notes.md', '# Notes\n' );
		setActiveTab( new TabInputText( document.uri ) );

		expect( listedCommands() ).toEqual( [
			'markBricks.openVisual',
			'workbench.action.openSettings',
		] );
	} );

	it( 'offers the text editor from the visual editor', () => {
		const document = createDocument( '/docs/notes.md', '# Notes\n' );
		setActiveTab(
			new TabInputCustom( document.uri, 'markBricks.visualEditor' )
		);

		expect( listedCommands() ).toEqual( [
			'markBricks.openText',
			'workbench.action.openSettings',
		] );
	} );

	it( 'offers the slide preview and the export for a Marp deck', () => {
		const document = createDocument( '/docs/deck.md', DECK );
		setActiveTab( new TabInputText( document.uri ) );

		expect( listedCommands() ).toEqual( [
			'markBricks.openVisual',
			'markBricks.openMarpPreview',
			'markBricks.exportSlideDeck',
			'workbench.action.openSettings',
		] );
	} );

	it( 'opens the settings filtered to the extension', () => {
		const items = getCommandItems( EXTENSION_ID );
		const settings = items[ items.length - 1 ];

		expect( settings.args ).toEqual( [ `@ext:${ EXTENSION_ID }` ] );
	} );
} );

describe( 'showCommandQuickPick', () => {
	it( 'runs the picked command', async () => {
		window.showQuickPick.mockImplementation(
			async ( items ) => items[ items.length - 1 ]
		);

		await showCommandQuickPick( EXTENSION_ID );

		expect( commands.executeCommand ).toHaveBeenCalledWith(
			'workbench.action.openSettings',
			`@ext:${ EXTENSION_ID }`
		);
	} );

	it( 'runs nothing when dismissed', async () => {
		window.showQuickPick.mockResolvedValue( undefined );

		await showCommandQuickPick( EXTENSION_ID );

		expect( commands.executeCommand ).not.toHaveBeenCalled();
	} );
} );
