/**
 * External dependencies
 */
import * as vscode from 'vscode';

/**
 * Internal dependencies
 */
import { MarkBricksEditorProvider } from './editor-provider';

// No-ops bound to Ctrl+Z/Y via `contributes.keybindings`. Undo must stay with
// the editor's own history: letting VSCode's `undo` rewind the TextDocument
// would reparse the markdown and throw the selection away. The webview can't
// prevent the keydown from reaching the workbench, so this shadows it instead
// — the same approach VSCode's built-in Markdown visual editor takes.
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
