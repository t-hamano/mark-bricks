// Space is left out, since it would also press a focused button.
const NEXT_KEYS = [ 'ArrowRight', 'ArrowDown', 'PageDown' ];
const PREVIOUS_KEYS = [ 'ArrowLeft', 'ArrowUp', 'PageUp' ];

/**
 * Keeps a slide index within a deck.
 *
 * @param index Index of the slide.
 * @param count Number of slides.
 * @return The index, moved to the first or last slide when out of range.
 */
export function clampSlideIndex( index: number, count: number ): number {
	return Math.min( Math.max( index, 0 ), Math.max( count - 1, 0 ) );
}

/**
 * Finds the slide a key moves to.
 *
 * @param key     `KeyboardEvent.key` of the pressed key.
 * @param current Index of the slide shown.
 * @param count   Number of slides.
 * @return Index of the slide to show, or `null` when the key does not move
 *         between slides.
 */
export function getSlideIndexForKey(
	key: string,
	current: number,
	count: number
): number | null {
	if ( NEXT_KEYS.includes( key ) ) {
		return clampSlideIndex( current + 1, count );
	}
	if ( PREVIOUS_KEYS.includes( key ) ) {
		return clampSlideIndex( current - 1, count );
	}
	if ( key === 'Home' ) {
		return 0;
	}
	if ( key === 'End' ) {
		return clampSlideIndex( count - 1, count );
	}
	return null;
}
