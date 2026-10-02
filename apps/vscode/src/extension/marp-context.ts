/**
 * External dependencies
 */
import * as vscode from 'vscode';
import { isMarpDocument } from '@mark-bricks/editor/marp';

/**
 * Internal dependencies
 */
import { MarkBricksEditorProvider } from './editor-provider';

// Context key that is true while the active tab edits a Marp slide deck, in
// the text editor or the visual editor.
export const MARP_CONTEXT_KEY = 'markBricks.isMarp';

// The document the active tab edits, if it is a text editor or the visual
// editor.
function getActiveDocument(): vscode.TextDocument | undefined {
	const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
	const uri =
		input instanceof vscode.TabInputText ||
		( input instanceof vscode.TabInputCustom &&
			input.viewType === MarkBricksEditorProvider.viewType )
			? input.uri
			: undefined;
	return uri
		? vscode.workspace.textDocuments.find(
				( document ) => document.uri.toString() === uri.toString()
			)
		: undefined;
}

// Keeps `MARP_CONTEXT_KEY` in sync with the active tab and its document.
export function trackMarpContext(): vscode.Disposable {
	let isMarp: boolean | undefined;
	const update = () => {
		const document = getActiveDocument();
		const next =
			document?.languageId === 'markdown' &&
			isMarpDocument( document.getText() );
		if ( next !== isMarp ) {
			isMarp = next;
			void vscode.commands.executeCommand(
				'setContext',
				MARP_CONTEXT_KEY,
				next
			);
		}
	};

	update();
	return vscode.Disposable.from(
		vscode.window.tabGroups.onDidChangeTabs( update ),
		vscode.window.tabGroups.onDidChangeTabGroups( update ),
		// The visual editor's document can open after its tab.
		vscode.workspace.onDidOpenTextDocument( update ),
		vscode.workspace.onDidChangeTextDocument( ( event ) => {
			if ( event.document === getActiveDocument() ) {
				update();
			}
		} )
	);
}
