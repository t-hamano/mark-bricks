/**
 * External dependencies
 */
import * as vscode from 'vscode';

/**
 * Internal dependencies
 */
import type { CodePreviewReport } from '../shared/messages';
import { MarkBricksEditorProvider } from './editor-provider';
import { trackMarpContext } from './marp-context';
import { MarpPreview } from './marp-preview';

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

// Returned from `activate` for the smoke test in `e2e/`, which cannot see the
// messages between the host and the webview.
export type ExtensionApi = {
	isEditorRendered: ( uri: vscode.Uri ) => boolean;
	getCodePreviews: ( uri: vscode.Uri ) => CodePreviewReport | null;
	getSlideCount: ( uri: vscode.Uri ) => number | null;
};

export function activate( context: vscode.ExtensionContext ): ExtensionApi {
	context.subscriptions.push(
		MarkBricksEditorProvider.register( context ),
		MarpPreview.register( context ),
		trackMarpContext()
	);

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
		} ),
		vscode.commands.registerCommand(
			'markBricks.openMarpPreview',
			async () => {
				const uri = resolveActiveResource();
				if ( uri ) {
					await MarpPreview.show( uri );
				}
			}
		)
	);

	return {
		isEditorRendered: ( uri ) =>
			MarkBricksEditorProvider.isEditorRendered( uri ),
		getCodePreviews: ( uri ) =>
			MarkBricksEditorProvider.getCodePreviews( uri ),
		getSlideCount: ( uri ) => MarpPreview.getSlideCount( uri ),
	};
}

export function deactivate(): void {}
