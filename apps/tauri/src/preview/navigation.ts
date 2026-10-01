// Space is left out, since it would also press a focused button.
const NEXT_KEYS = [ 'ArrowRight', 'ArrowDown', 'PageDown' ];
const PREVIOUS_KEYS = [ 'ArrowLeft', 'ArrowUp', 'PageUp' ];

// Wheel events further apart than this, in milliseconds, start a new gesture.
// A trackpad keeps sending them while its scrolling coasts to a stop.
const WHEEL_GESTURE_GAP = 60;

// How far, in pixels, a gesture scrolls before it moves to another slide.
const WHEEL_THRESHOLD = 20;

// How much further, in pixels, a gesture scrolls to move to each slide after
// the first.
const WHEEL_REPEAT_DISTANCE = 100;

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

/**
 * Tracks wheel gestures, so that a gesture moves to another slide as soon as
 * it scrolls a little, and then to one more slide each time it scrolls
 * further, however many wheel events it sends.
 *
 * @return Function that takes a wheel event's `deltaY` and `timeStamp`, and
 *         returns how many slides to move: 1, -1, or 0 to stay.
 */
export function createWheelTracker(): (
	deltaY: number,
	timeStamp: number
) => number {
	let lastTimeStamp = -Infinity;
	let distance = 0;
	let moved = false;

	return ( deltaY, timeStamp ) => {
		if ( timeStamp - lastTimeStamp > WHEEL_GESTURE_GAP ) {
			distance = 0;
			moved = false;
		}
		lastTimeStamp = timeStamp;
		distance += deltaY;
		const threshold = moved ? WHEEL_REPEAT_DISTANCE : WHEEL_THRESHOLD;
		if ( Math.abs( distance ) < threshold ) {
			return 0;
		}
		const step = Math.sign( distance );
		distance = 0;
		moved = true;
		return step;
	};
}
