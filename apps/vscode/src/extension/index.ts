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

export function activate( context: vscode.ExtensionContext ): void {
	context.subscriptions.push( MarkBricksEditorProvider.register( context ) );

	for ( const command of SHADOWED_COMMANDS ) {
		context.subscriptions.push(
			vscode.commands.registerCommand( command, () => {} )
		);
	}
}

export function deactivate(): void {}
