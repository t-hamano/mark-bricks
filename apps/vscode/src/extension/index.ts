/**
 * External dependencies
 */
import * as vscode from 'vscode';

/**
 * Internal dependencies
 */
import { MarkBricksEditorProvider } from './editor-provider';

/**
 * Commands that exist only to swallow a keystroke.
 *
 * Undo has to stay with the editor's own history. Letting VSCode handle it
 * would rewind the TextDocument, and the resulting external update reparses
 * the markdown into a fresh block tree, throwing the selection away; the two
 * histories would also fire together and rewind twice.
 *
 * The webview cannot stop this itself. Its keydown handler re-dispatches a
 * synthesized event on the workbench window whether or not the webview called
 * `preventDefault()`, and VSCode has no webview-specific `undo` to override.
 * So `contributes.keybindings` binds the shortcuts to these no-ops instead —
 * the same approach VSCode's own built-in Markdown visual editor takes. By the
 * time they run, the editor's `useShortcut` has already handled the DOM event.
 */
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
