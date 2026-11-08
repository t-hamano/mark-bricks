/**
 * Internal dependencies
 */
import { SOURCE_LINE_ATTRIBUTE } from '../render/source-lines';

const SELECTOR = `[${ SOURCE_LINE_ATTRIBUTE }]`;

function readLine( element: Element ): number {
	return Number( element.getAttribute( SOURCE_LINE_ATTRIBUTE ) );
}

/**
 * Finds the line of the Markdown that the element under a pointer starts at.
 *
 * @param target The element under the pointer, such as an event's target.
 * @return The line of the innermost element with one, or `null` when there is
 *         none, such as outside the slides.
 */
export function getSourceLine( target: EventTarget | null ): number | null {
	const element =
		target instanceof Element ? target.closest( SELECTOR ) : null;
	return element ? readLine( element ) : null;
}

/**
 * Finds the element that shows a line of the Markdown: the one that starts
 * at the line, or else the closest one before it. Of the elements that start
 * at the same line, such as a list and its first item, it takes the
 * outermost.
 *
 * @param root Element that holds the slides.
 * @param line Line of the Markdown, counted from 0.
 * @return The element, or `null` when none starts at or before the line.
 */
export function findSourceElement(
	root: ParentNode,
	line: number
): Element | null {
	let found: Element | null = null;
	let foundLine = -1;
	// In document order, an element comes before those nested in it.
	for ( const element of root.querySelectorAll( SELECTOR ) ) {
		const elementLine = readLine( element );
		if ( elementLine <= line && elementLine > foundLine ) {
			found = element;
			foundLine = elementLine;
		}
	}
	return found;
}
