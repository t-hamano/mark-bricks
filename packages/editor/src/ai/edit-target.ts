/**
 * Internal dependencies
 */
import type { AiEdit, AiEditResult } from '../platform';

/**
 * Wraps the selection in the context sent to the model with each message.
 */
export const SELECTION_START = '<selection>';
export const SELECTION_END = '</selection>';

/**
 * What the AI assistant sends to the model about the document.
 */
export type EditContext = {
	/**
	 * The whole document as Markdown.
	 */
	document: string;
	/**
	 * The selection as Markdown. Empty when nothing is selected.
	 */
	selection: string;
	/**
	 * Where the selection is in `document`, as character offsets. Both are
	 * the place where new content goes when nothing is selected.
	 */
	selectionStart: number;
	selectionEnd: number;
};

/**
 * The selection the AI assistant edits, captured when the user sends a
 * message. Each editor mode provides its own.
 */
export type EditTarget = {
	getContext: () => EditContext;
	/**
	 * The whole document as it is now, in the same form as the context's
	 * `document`.
	 */
	getDocument: () => string;
	/**
	 * Applies the model's edit, as one undo step: to the captured
	 * selection, or for `replace_text`, to the text it names. Changes
	 * nothing, and returns `dropped` when the selection no longer exists,
	 * or `failed` when the text to replace is not in the document, or is
	 * in more than one place.
	 */
	apply: ( edit: AiEdit ) => AiEditResult;
};

/**
 * Joins the Markdown before, inside and after the selection into the
 * document sent to the model, separated by blank lines.
 *
 * @param before    Markdown before the selection.
 * @param selection Markdown of the selection.
 * @param after     Markdown after the selection.
 * @return The document, and where the selection is in it.
 */
export function joinAroundSelection(
	before: string,
	selection: string,
	after: string
): EditContext {
	const trim = ( part: string ) => part.replace( /\n+$/, '' );
	const head = trim( before );
	const marked = trim( selection );
	const tail = trim( after );
	const parts = [ head, marked, tail ].filter( ( part ) => part !== '' );
	const document = parts.length ? parts.join( '\n\n' ) + '\n' : '';
	let selectionStart = head ? head.length + 2 : 0;
	if ( ! marked && ! tail ) {
		// Nothing follows, so new content goes at the end.
		selectionStart = document.length;
	}
	return {
		document,
		selection,
		selectionStart,
		selectionEnd: selectionStart + marked.length,
	};
}
