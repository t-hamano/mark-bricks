/**
 * External dependencies
 */
import {
	Editor,
	applyLocale,
	registerBlocks,
	registerFormats,
} from '@mark-bricks/editor';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * Internal dependencies
 */
import './style.scss';

// The block and format registries have to be populated before the editor is
// rendered, and the locale before either of them reads a translated label.
// Matches the mount order in `apps/tauri/src/main.tsx`.
applyLocale( undefined );
registerBlocks();
registerFormats();

const container = document.getElementById( 'root' );

if ( container ) {
	createRoot( container ).render(
		<StrictMode>
			<Editor
				content=""
				onChange={ () => {} }
				editorMode="visual"
				settings={ {
					// The host document is edited as text in VSCode's own
					// editor, so the built-in code editor is never shown.
					enableCodeEditor: false,
					// Undo is handled by the editor's internal history, whose
					// buttons the VSCode UI does not need to duplicate.
					showUndoRedo: false,
				} }
			/>
		</StrictMode>
	);
}
