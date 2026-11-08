/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import { markdownToBlocks } from '../converter';
import { getSlidePatternMarkdown } from '.';
import type { SlidePattern } from './types';

const SEPARATOR_BLOCK = 'core/separator';

function isSeparator( block: Block | undefined ): boolean {
	return block?.name === SEPARATOR_BLOCK;
}

/**
 * Converts a pattern into the blocks to insert between two blocks.
 *
 * A pattern holds whole slides, so it gets a slide separator (`---`) on each
 * side that touches other content. Without one, the pattern's first slide
 * would merge into the slide before it, and its last slide into the slide
 * after it.
 *
 * @param pattern The pattern to insert.
 * @param before  The block the pattern goes after, if any.
 * @param after   The block the pattern goes before, if any.
 * @return Blocks of the pattern, with the separators it needs.
 */
export function getSlidePatternBlocks(
	pattern: SlidePattern,
	before: Block | undefined,
	after: Block | undefined
): Block[] {
	const blocks = markdownToBlocks( getSlidePatternMarkdown( pattern ) );
	return [
		...( before && ! isSeparator( before )
			? markdownToBlocks( '---' )
			: [] ),
		...blocks,
		...( after && ! isSeparator( after ) ? markdownToBlocks( '---' ) : [] ),
	];
}
