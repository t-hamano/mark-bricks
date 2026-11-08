/**
 * External dependencies
 */
import type { editor as MonacoEditor } from 'monaco-editor';

/**
 * Internal dependencies
 */
import type { TextEditorAccess, TextRange } from './text-edit-target';

// `monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges`. Written
// out so this module does not load Monaco, which the text editor loads lazily.
const NEVER_GROWS_WHEN_TYPING_AT_EDGES = 1;

/**
 * Reads and edits a Monaco editor for `createTextEditTarget`.
 *
 * @param editor The text editor's Monaco instance.
 * @return Text editor access.
 */
export function getTextEditorAccess(
	editor: MonacoEditor.IStandaloneCodeEditor
): TextEditorAccess {
	const toMonacoRange = (
		model: MonacoEditor.ITextModel,
		{ start, end }: TextRange
	) => {
		const from = model.getPositionAt( start );
		const to = model.getPositionAt( end );
		return {
			startLineNumber: from.lineNumber,
			startColumn: from.column,
			endLineNumber: to.lineNumber,
			endColumn: to.column,
		};
	};

	return {
		getValue: () => editor.getModel()?.getValue() ?? '',

		getSelection() {
			const model = editor.getModel();
			const selection = editor.getSelection();
			if ( ! model || ! selection ) {
				return { start: 0, end: 0 };
			}
			return {
				start: model.getOffsetAt( selection.getStartPosition() ),
				end: model.getOffsetAt( selection.getEndPosition() ),
			};
		},

		trackRange( range ) {
			const model = editor.getModel();
			if ( ! model ) {
				return () => null;
			}
			const decorations = editor.createDecorationsCollection( [
				{
					range: toMonacoRange( model, range ),
					options: {
						stickiness: NEVER_GROWS_WHEN_TYPING_AT_EDGES,
					},
				},
			] );
			return () => {
				if ( model.isDisposed() || editor.getModel() !== model ) {
					return null;
				}
				const current = decorations.getRange( 0 );
				if ( ! current ) {
					return null;
				}
				return {
					start: model.getOffsetAt( current.getStartPosition() ),
					end: model.getOffsetAt( current.getEndPosition() ),
				};
			};
		},

		replaceRange( range, text ) {
			const model = editor.getModel();
			if ( ! model ) {
				return;
			}
			editor.pushUndoStop();
			editor.executeEdits( 'ai-assistant', [
				{
					range: toMonacoRange( model, range ),
					text,
					forceMoveMarkers: true,
				},
			] );
			editor.pushUndoStop();
		},
	};
}
