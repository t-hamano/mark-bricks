/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import { blockToMarkdown } from './blocks-to-markdown';

// The lines of a document a block takes up: from `start` up to, but not
// including, `end`, counted from 0, as markdown-it counts them.
export type BlockLineRange = { start: number; end: number };

// How many lines each block takes up. Blocks are immutable, and an edit
// replaces only the blocks it changes, so the others keep their count.
const lineCounts = new WeakMap< Block, number >();

function countLines( block: Block ): number {
	let count = lineCounts.get( block );
	if ( count === undefined ) {
		const markdown = blockToMarkdown( block );
		count = markdown === '' ? 0 : markdown.split( '\n' ).length;
		lineCounts.set( block, count );
	}
	return count;
}

/**
 * Finds the lines that each top-level block takes up in the document the
 * editor writes, which `joinFrontMatter` and `blocksToMarkdown` make of them.
 *
 * @param blocks      Top-level blocks of the document.
 * @param frontMatter Front matter content, or `null` when there is none.
 * @return The lines of each block, in the order of `blocks`, or `null` for a
 *         block that writes nothing.
 */
export function getBlockLineRanges(
	blocks: Block[],
	frontMatter: string | null
): Array< BlockLineRange | null > {
	// The front matter's fences and content, and the blank line after them.
	let line =
		frontMatter === null
			? 0
			: ( frontMatter === '' ? 0 : frontMatter.split( '\n' ).length ) + 3;
	return blocks.map( ( block ) => {
		const count = countLines( block );
		if ( count === 0 ) {
			return null;
		}
		const range = { start: line, end: line + count };
		// The blank line between blocks.
		line = range.end + 1;
		return range;
	} );
}

/**
 * Finds the top-level block that shows a line of the document: the one that
 * takes it up, or else the closest one before it, or the first one when the
 * line is before every block, such as in the front matter.
 *
 * @param ranges The lines of each block, from {@link getBlockLineRanges}.
 * @param line   Line of the document, counted from 0.
 * @return Index of the block, or -1 when no block writes anything.
 */
export function findBlockIndexAtLine(
	ranges: Array< BlockLineRange | null >,
	line: number
): number {
	let found = -1;
	for ( let index = 0; index < ranges.length; index++ ) {
		const range = ranges[ index ];
		if ( ! range ) {
			continue;
		}
		if ( found === -1 || range.start <= line ) {
			found = index;
		}
		if ( range.start > line ) {
			break;
		}
	}
	return found;
}
