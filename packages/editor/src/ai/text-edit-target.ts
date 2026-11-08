/**
 * Internal dependencies
 */
import { SELECTION_END, SELECTION_START, type EditTarget } from './edit-target';

/**
 * A range of the text editor's content, as character offsets.
 */
export type TextRange = {
	start: number;
	end: number;
};

/**
 * The parts of the text editor the target reads and changes.
 * `getTextEditorAccess` provides them for Monaco.
 */
export type TextEditorAccess = {
	getValue: () => string;
	getSelection: () => TextRange;
	/**
	 * Follows `range` through later edits. The returned function gives its
	 * current position, or `null` when the range or the editor is gone.
	 */
	trackRange: ( range: TextRange ) => () => TextRange | null;
	/**
	 * Replaces `range` with `text` as one undo step.
	 */
	replaceRange: ( range: TextRange, text: string ) => void;
};

/**
 * Widens an empty selection to the line it is on.
 *
 * @param value     The editor's content.
 * @param selection The selection.
 * @return The range to edit.
 */
function getEditRange( value: string, selection: TextRange ): TextRange {
	if ( selection.start !== selection.end ) {
		return selection;
	}
	const start = value.lastIndexOf( '\n', selection.start - 1 ) + 1;
	const lineEnd = value.indexOf( '\n', selection.start );
	return { start, end: lineEnd === -1 ? value.length : lineEnd };
}

/**
 * Creates the edit target for the text editor, from the selection now. With
 * no selection, the target is the line the cursor is on.
 *
 * @param access Text editor access.
 * @return The edit target.
 */
export function createTextEditTarget( access: TextEditorAccess ): EditTarget {
	const value = access.getValue();
	const range = getEditRange( value, access.getSelection() );
	const getRange = access.trackRange( range );

	return {
		getContext() {
			return {
				selection: value.slice( range.start, range.end ),
				document:
					value.slice( 0, range.start ) +
					SELECTION_START +
					value.slice( range.start, range.end ) +
					SELECTION_END +
					value.slice( range.end ),
			};
		},

		apply( { action, markdown } ) {
			const current = getRange();
			if ( ! current ) {
				return false;
			}
			const text = access.getValue();
			const content = markdown.replace( /\n+$/, '' );

			if ( action === 'replace' ) {
				// Keep the line break that ended the selection, if any.
				const selected = text.slice( current.start, current.end );
				const lineBreak = /\n+$/.exec( selected )?.[ 0 ] ?? '';
				access.replaceRange( current, content + lineBreak );
				return true;
			}

			// Insert after the selection's last line, separated from it, and
			// from what follows, by a blank line.
			const lastLineEnd =
				current.end > current.start && text[ current.end - 1 ] === '\n'
					? current.end - 1
					: text.indexOf( '\n', current.end );
			const at = lastLineEnd === -1 ? text.length : lastLineEnd;
			const rest = text.slice( at );
			const needsBlankLineAfter =
				rest !== '' && rest !== '\n' && ! rest.startsWith( '\n\n' );
			access.replaceRange(
				{ start: at, end: at },
				'\n\n' + content + ( needsBlankLineAfter ? '\n' : '' )
			);
			return true;
		},
	};
}
