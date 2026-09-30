/**
 * External dependencies
 */
import type { Processor } from 'unified';
import { math } from 'micromark-extension-math';
import { mathFromMarkdown, mathToMarkdown } from 'mdast-util-math';

/**
 * unified plugin that reads and writes `$$`-fenced math blocks.
 *
 * ```md
 * $$
 * E = mc^2
 * $$
 * ```
 *
 * Only the block syntax is registered, not all of remark-math. remark-math
 * would also read `$...$` in a paragraph as inline math, which the rich text
 * has no format for, and its unsafe patterns would escape every `$` written in
 * a paragraph.
 */
export function remarkMathBlock( this: Processor ): void {
	const data = this.data();
	( data.micromarkExtensions ??= [] ).push( { flow: math().flow } );
	( data.fromMarkdownExtensions ??= [] ).push( mathFromMarkdown() );
	( data.toMarkdownExtensions ??= [] ).push( {
		handlers: { math: mathToMarkdown().handlers?.math },
	} );
}
