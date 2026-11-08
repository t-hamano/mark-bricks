/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import { blockToMarkdown } from './blocks-to-markdown';
import { splitFrontMatter } from './front-matter';
import { markdownToBlockSpans } from './markdown-to-blocks';

// The lines of a document a block takes up: from `start` up to, but not
// including, `end`, counted from 0, as markdown-it counts them.
export type BlockLineRange = { start: number; end: number };

// The Markdown each block writes. Blocks are immutable, and an edit replaces
// only the blocks it changes, so the others keep theirs.
const markdowns = new WeakMap< Block, string >();

function toMarkdown( block: Block ): string {
	let markdown = markdowns.get( block );
	if ( markdown === undefined ) {
		markdown = blockToMarkdown( block );
		markdowns.set( block, markdown );
	}
	return markdown;
}

function countLines( block: Block ): number {
	const markdown = toMarkdown( block );
	return markdown === '' ? 0 : markdown.split( '\n' ).length;
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

// A top-level block of a document as it is written, and its lines.
type SourceBlock = { block: Block; range: BlockLineRange };

// The blocks of the document last read, as the editor shows the same one
// across many selections.
let lastSource: { markdown: string; blocks: SourceBlock[] } | null = null;

function readSourceBlocks( markdown: string ): SourceBlock[] {
	if ( lastSource?.markdown === markdown ) {
		return lastSource.blocks;
	}
	const { body } = splitFrontMatter( markdown );
	// The lines of the front matter, which the body's positions leave out.
	const offset =
		markdown.slice( 0, markdown.length - body.length ).split( '\n' )
			.length - 1;
	const blocks = markdownToBlockSpans( body ).flatMap( ( span ) => {
		const start = span.first.position?.start.line ?? 1;
		const end = span.last.position?.end.line ?? start;
		// markdown-it counts lines from 0, and mdast from 1.
		return span.blocks.map( ( block ) => ( {
			block,
			range: { start: start - 1 + offset, end: end + offset },
		} ) );
	} );
	lastSource = { markdown, blocks };
	return blocks;
}

/**
 * Finds the lines that each top-level block takes up in a document as it is
 * written, which can differ from the document the editor writes of the same
 * blocks, such as by its blank lines or its list markers.
 *
 * @param markdown The document, with its front matter if any.
 * @return The lines of each top-level block that `splitFrontMatter` and
 *         `markdownToBlocks` make of the document, in their order.
 */
export function getSourceBlockLineRanges( markdown: string ): BlockLineRange[] {
	return readSourceBlocks( markdown ).map( ( { range } ) => range );
}

/**
 * Finds the lines that each top-level block takes up in a document as it is
 * written, which the host shows elsewhere, such as in a slide preview. The
 * blocks match it while they are the ones parsed from it, and again once the
 * editor writes out an edit. In between, while the blocks of the document
 * write other Markdown, their lines are counted in the document the editor
 * writes of them instead.
 *
 * @param blocks      Top-level blocks of the document.
 * @param frontMatter Front matter content, or `null` when there is none.
 * @param markdown    The document as it is written.
 * @return The lines of each block, in the order of `blocks`, or `null` for a
 *         block that writes nothing.
 */
export function getDocumentBlockLineRanges(
	blocks: Block[],
	frontMatter: string | null,
	markdown: string
): Array< BlockLineRange | null > {
	const source = readSourceBlocks( markdown );
	const matches =
		source.length === blocks.length &&
		source.every(
			( { block }, index ) =>
				toMarkdown( block ) === toMarkdown( blocks[ index ] )
		);
	return matches
		? source.map( ( { range } ) => range )
		: getBlockLineRanges( blocks, frontMatter );
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
