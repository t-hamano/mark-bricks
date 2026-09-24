/**
 * External dependencies
 */
import type { EditorTheme } from '@mark-bricks/editor/editor-theme-provider';
import { useSyncExternalStore } from 'react';

function subscribe( onChange: () => void ): () => void {
	const observer = new MutationObserver( onChange );
	observer.observe( document.body, {
		attributes: true,
		attributeFilter: [ 'class' ],
	} );
	return () => observer.disconnect();
}

// VS Code tags the webview body with `vscode-light`, `vscode-dark`,
// `vscode-high-contrast` or `vscode-high-contrast-light`, and updates it when
// the color theme changes.
function getSnapshot(): EditorTheme {
	const { classList } = document.body;
	return classList.contains( 'vscode-dark' ) ||
		classList.contains( 'vscode-high-contrast' )
		? 'dark'
		: 'light';
}

/**
 * The appearance of the active VS Code color theme. It follows the workbench
 * rather than the OS, since the two can differ.
 */
export function useVsCodeTheme(): EditorTheme {
	return useSyncExternalStore( subscribe, getSnapshot );
}
