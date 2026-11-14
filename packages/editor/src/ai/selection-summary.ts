/**
 * WordPress dependencies
 */
import { __, _n, sprintf } from '@wordpress/i18n';

export type TextSelection = {
	isEmpty: boolean;
	startLine: number;
	endLine: number;
};

/**
 * Describes the selected lines, as the text edit target sends them: with no
 * selection, the line the cursor is on.
 *
 * @param selection The text editor's selection.
 */
export function describeTextSelection( selection: TextSelection ) {
	if ( selection.isEmpty ) {
		return sprintf(
			/* translators: %d: The line number. */
			__( 'Line %d', 'mark-bricks' ),
			selection.startLine
		);
	}
	const count = selection.endLine - selection.startLine + 1;
	return sprintf(
		/* translators: %d: The number of lines. */
		_n( '%d line selected', '%d lines selected', count, 'mark-bricks' ),
		count
	);
}

/**
 * Describes the selected blocks, as the block edit target sends them: the
 * top-level blocks that contain the selection.
 *
 * @param count The number of top-level blocks.
 */
export function describeBlockSelection( count: number ) {
	if ( count === 0 ) {
		return __( 'No block selected', 'mark-bricks' );
	}
	return sprintf(
		/* translators: %d: The number of blocks. */
		_n( '%d block selected', '%d blocks selected', count, 'mark-bricks' ),
		count
	);
}
