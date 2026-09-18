/**
 * External dependencies
 */
import * as vscode from 'vscode';

/**
 * Internal dependencies
 */
import { MarkBricksEditorProvider } from './editor-provider';

const SHADOWED_COMMANDS = [
	'markBricks.suppressUndo',
	'markBricks.suppressRedo',
];

function resolveActiveResource(): vscode.Uri | undefined {
	const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
	const input = activeTab?.input;
	if (
		input instanceof vscode.TabInputText ||
		input instanceof vscode.TabInputCustom
	) {
		return input.uri;
	}
	return vscode.window.activeTextEditor?.document.uri;
}

export function activate( context: vscode.ExtensionContext ): void {
	context.subscriptions.push( MarkBricksEditorProvider.register( context ) );

	for ( const command of SHADOWED_COMMANDS ) {
		context.subscriptions.push(
			vscode.commands.registerCommand( command, () => {} )
		);
	}

	context.subscriptions.push(
		vscode.commands.registerCommand( 'markBricks.openVisual', async () => {
			const uri = resolveActiveResource();
			if ( uri ) {
				await vscode.commands.executeCommand(
					'vscode.openWith',
					uri,
					MarkBricksEditorProvider.viewType
				);
			}
		} ),
		vscode.commands.registerCommand( 'markBricks.openText', async () => {
			const uri = resolveActiveResource();
			if ( uri ) {
				await vscode.commands.executeCommand(
					'vscode.openWith',
					uri,
					'default'
				);
			}
		} )
	);
}

export function deactivate(): void {}
