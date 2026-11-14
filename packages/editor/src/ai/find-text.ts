/**
 * Internal dependencies
 */
import { SELECTION_END, SELECTION_START } from './edit-target';

/**
 * Where `find` is in the text, as character offsets.
 */
export type FoundText = { start: number; end: number };

/**
 * Finds the one place in `text` that matches `find` exactly. The reason
 * for a miss is sent to the model, so that it can try again.
 *
 * @param text The text to search.
 * @param find The text the model wants to replace.
 * @return The place, or the reason it was not found.
 */
export function findUniqueText(
	text: string,
	find: string
): FoundText | { reason: string } {
	if ( find === '' ) {
		return {
			reason: 'The "find" text is empty. Copy the exact text to replace from the document, and try again.',
		};
	}
	if ( find.includes( SELECTION_START ) || find.includes( SELECTION_END ) ) {
		return {
			reason: `The "find" text includes the ${ SELECTION_START } tags, which are not part of the document. Leave them out, and try again.`,
		};
	}
	const start = text.indexOf( find );
	if ( start === -1 ) {
		return {
			reason: 'The "find" text is not in the document. Copy it exactly from the document, including spaces and line breaks but without the line numbers, and try again.',
		};
	}
	let count = 1;
	for (
		let at = text.indexOf( find, start + 1 );
		at !== -1;
		at = text.indexOf( find, at + 1 )
	) {
		count++;
	}
	if ( count > 1 ) {
		return {
			reason: `The "find" text appears ${ count } times in the document. Include more of the text around it, so that it matches only one place, and try again.`,
		};
	}
	return { start, end: start + find.length };
}
