/**
 * External dependencies
 */
import { useEffect, useState } from 'react';
import type { editor as MonacoEditor } from 'monaco-editor';

/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';

/**
 * Internal dependencies
 */
import {
	describeBlockSelection,
	describeTextSelection,
	type TextSelection,
} from './selection-summary';

function getTextSelection(
	editor: MonacoEditor.IStandaloneCodeEditor
): TextSelection | null {
	const selection = editor.getSelection();
	if ( ! selection ) {
		return null;
	}
	// A selection that ends at the start of a line does not include it.
	const endLine =
		selection.endColumn === 1 &&
		selection.endLineNumber > selection.startLineNumber
			? selection.endLineNumber - 1
			: selection.endLineNumber;
	return {
		isEmpty: selection.isEmpty(),
		startLine: selection.startLineNumber,
		endLine,
	};
}

/**
 * Describes what the AI assistant sends as the selection with the next
 * message, and keeps the description up to date.
 *
 * @param editorMode The active editor mode.
 * @param textEditor The text editor's Monaco instance, if it is open.
 */
export function useSelectionSummary(
	editorMode: 'visual' | 'text',
	textEditor: MonacoEditor.IStandaloneCodeEditor | null
): string | null {
	const blockCount = useSelect(
		( select ) => {
			if ( editorMode !== 'visual' ) {
				return 0;
			}
			const { getSelectedBlockClientIds, getBlockHierarchyRootClientId } =
				select( blockEditorStore );
			return new Set(
				getSelectedBlockClientIds().map( ( clientId ) =>
					getBlockHierarchyRootClientId( clientId )
				)
			).size;
		},
		[ editorMode ]
	);

	const [ textSelection, setTextSelection ] =
		useState< TextSelection | null >( null );

	useEffect( () => {
		if ( editorMode !== 'text' || ! textEditor ) {
			setTextSelection( null );
			return;
		}
		setTextSelection( getTextSelection( textEditor ) );
		const subscription = textEditor.onDidChangeCursorSelection( () =>
			setTextSelection( getTextSelection( textEditor ) )
		);
		return () => subscription.dispose();
	}, [ editorMode, textEditor ] );

	if ( editorMode === 'visual' ) {
		return describeBlockSelection( blockCount );
	}
	return textSelection ? describeTextSelection( textSelection ) : null;
}
