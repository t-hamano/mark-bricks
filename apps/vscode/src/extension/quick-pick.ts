/**
 * External dependencies
 */
import * as vscode from 'vscode';

/**
 * Internal dependencies
 */
import { MarkBricksEditorProvider } from './editor-provider';
import { isActiveDocumentMarp } from './marp-context';

type CommandItem = vscode.QuickPickItem & {
	command: string;
	args?: unknown[];
};

function isVisualEditorActive(): boolean {
	const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
	return (
		input instanceof vscode.TabInputCustom &&
		input.viewType === MarkBricksEditorProvider.viewType
	);
}

// The MarkBricks commands that apply to the active tab.
export function getCommandItems( extensionId: string ): CommandItem[] {
	const items: CommandItem[] = [];
	if ( isVisualEditorActive() ) {
		items.push( {
			label: `$(go-to-file) ${ vscode.l10n.t( 'Open with Text Editor' ) }`,
			command: 'markBricks.openText',
		} );
	} else {
		items.push( {
			label: `$(edit) ${ vscode.l10n.t( 'Open with MarkBricks' ) }`,
			command: 'markBricks.openVisual',
		} );
	}
	if ( isActiveDocumentMarp() ) {
		items.push( {
			label: `$(open-preview) ${ vscode.l10n.t( 'Preview Slides' ) }`,
			command: 'markBricks.openMarpPreview',
		} );
		items.push( {
			label: `$(export) ${ vscode.l10n.t( 'Export Slide Deck…' ) }`,
			command: 'markBricks.exportSlideDeck',
		} );
	}
	items.push( {
		label: `$(gear) ${ vscode.l10n.t( 'Open Extension Settings' ) }`,
		command: 'workbench.action.openSettings',
		args: [ `@ext:${ extensionId }` ],
	} );
	return items;
}

// Lists the MarkBricks commands, like the menu Marp for VS Code shows from
// its editor title button, and runs the one the user picks.
export async function showCommandQuickPick(
	extensionId: string
): Promise< void > {
	const item = await vscode.window.showQuickPick(
		getCommandItems( extensionId ),
		{ placeHolder: vscode.l10n.t( 'Select a MarkBricks command' ) }
	);
	if ( item ) {
		await vscode.commands.executeCommand(
			item.command,
			...( item.args ?? [] )
		);
	}
}
