/**
 * External dependencies
 */
import type { editor as MonacoEditorTypes } from 'monaco-editor';

type Editor = MonacoEditorTypes.IStandaloneCodeEditor;

const MARKUP_RE = /^(\s*)(?:([-*+])|(\d+)([.)]))(\s+)(\[[ xX]\]\s+)?/;
const QUOTE_RE = /^(\s*(?:>\s*)+)/;

function matchMarkup( line: string ) {
	const m = MARKUP_RE.exec( line );
	if ( m ) {
		const indent = m[ 1 ] ?? '';
		const bullet = m[ 2 ];
		const num = m[ 3 ];
		const punct = m[ 4 ];
		const spacing = m[ 5 ] ?? ' ';
		const task = m[ 6 ] ?? '';
		const taskNext = task ? '[ ] ' : '';
		const marker = bullet ?? `${ num }${ punct }`;
		const nextMarker = bullet
			? bullet
			: `${ parseInt( num as string, 10 ) + 1 }${ punct }`;
		return {
			prefix: indent + marker + spacing + task,
			indent,
			next: indent + nextMarker + spacing + taskNext,
		};
	}
	const q = QUOTE_RE.exec( line );
	if ( q ) {
		return { prefix: q[ 1 ], indent: '', next: q[ 1 ] };
	}
	return null;
}

// On Enter, continues the current line's list/quote prefix on the next line
// (incrementing numbered markers), or exits the list when the line is empty.
export function insertNewlineContinueMarkup( editor: Editor ) {
	const model = editor.getModel();
	if ( ! model ) {
		return false;
	}
	const sel = editor.getSelection();
	if ( ! sel || ! sel.isEmpty() ) {
		return false;
	}

	const lineNumber = sel.startLineNumber;
	const column = sel.startColumn;
	const lineText = model.getLineContent( lineNumber );
	const markup = matchMarkup( lineText );
	if ( ! markup ) {
		return false;
	}
	if ( column - 1 < markup.prefix.length ) {
		return false;
	}

	const contentBefore = lineText.slice( markup.prefix.length, column - 1 );
	const contentAfter = lineText.slice( column - 1 );

	if ( contentBefore.trim() === '' && contentAfter.trim() === '' ) {
		editor.executeEdits( 'markdown-continue', [
			{
				range: {
					startLineNumber: lineNumber,
					startColumn: 1,
					endLineNumber: lineNumber,
					endColumn: lineText.length + 1,
				},
				text: markup.indent,
			},
		] );
		editor.setPosition( {
			lineNumber,
			column: markup.indent.length + 1,
		} );
		return true;
	}

	editor.executeEdits( 'markdown-continue', [
		{
			range: {
				startLineNumber: lineNumber,
				startColumn: column,
				endLineNumber: lineNumber,
				endColumn: column,
			},
			text: '\n' + markup.next,
		},
	] );
	editor.setPosition( {
		lineNumber: lineNumber + 1,
		column: markup.next.length + 1,
	} );
	return true;
}

// On Backspace at the position right after a list/quote prefix, removes the
// whole prefix at once instead of deleting it one character at a time.
export function deleteMarkupBackward( editor: Editor ) {
	const model = editor.getModel();
	if ( ! model ) {
		return false;
	}
	const sel = editor.getSelection();
	if ( ! sel || ! sel.isEmpty() ) {
		return false;
	}

	const lineNumber = sel.startLineNumber;
	const column = sel.startColumn;
	const lineText = model.getLineContent( lineNumber );
	const markup = matchMarkup( lineText );
	if ( ! markup ) {
		return false;
	}
	if ( column - 1 !== markup.prefix.length ) {
		return false;
	}

	editor.executeEdits( 'markdown-delete', [
		{
			range: {
				startLineNumber: lineNumber,
				startColumn: 1,
				endLineNumber: lineNumber,
				endColumn: markup.prefix.length + 1,
			},
			text: markup.indent,
		},
	] );
	editor.setPosition( {
		lineNumber,
		column: markup.indent.length + 1,
	} );
	return true;
}
