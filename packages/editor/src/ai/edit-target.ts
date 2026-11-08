/**
 * Internal dependencies
 */
import type { AiEdit } from '../platform';

/**
 * Wraps the selection in the document sent to the model, so the model
 * sees where the selection sits.
 */
export const SELECTION_START = '<selection>';
export const SELECTION_END = '</selection>';

/**
 * What the AI assistant sends to the model about the document.
 */
export type EditContext = {
	/**
	 * The selection as Markdown. Empty when nothing is selected.
	 */
	selection: string;
	/**
	 * The whole document as Markdown, with the selection wrapped in
	 * `SELECTION_START` and `SELECTION_END`.
	 */
	document: string;
};

/**
 * The selection the AI assistant edits, captured when the user sends a
 * message. Each editor mode provides its own.
 */
export type EditTarget = {
	getContext: () => EditContext;
	/**
	 * Applies the model's edit to the captured selection, as one undo step.
	 * Returns `false`, and changes nothing, when the selection no longer
	 * exists.
	 */
	apply: ( edit: AiEdit ) => boolean;
};

/**
 * Joins the Markdown before, inside and after the selection into the
 * document sent to the model.
 *
 * @param before    Markdown before the selection.
 * @param selection Markdown of the selection.
 * @param after     Markdown after the selection.
 * @return The document with the selection markers.
 */
export function joinWithSelectionMarkers(
	before: string,
	selection: string,
	after: string
): string {
	const marked = selection
		? `${ SELECTION_START }\n${ selection.replace( /\n+$/, '' ) }\n${ SELECTION_END }`
		: SELECTION_START + SELECTION_END;
	return [ before, marked, after ]
		.map( ( part ) => part.replace( /\n+$/, '' ) )
		.filter( ( part ) => part !== '' )
		.join( '\n\n' )
		.concat( '\n' );
}
