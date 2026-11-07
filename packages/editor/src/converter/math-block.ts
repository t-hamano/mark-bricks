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
 *
 * A `$$` at the start of a line in a paragraph is escaped only when the rest
 * of the line holds no `$`, the one case in which it would open a math block
 * when the file is read again. remark-math escapes every `$$` that starts a
 * line, which would turn a one-line `$$E=mc^2$$` into `\$$E=mc^2$$`.
 */
export function remarkMathBlock( this: Processor ): void {
	const data = this.data();
	( data.micromarkExtensions ??= [] ).push( { flow: math().flow } );
	( data.fromMarkdownExtensions ??= [] ).push( mathFromMarkdown() );
	( data.toMarkdownExtensions ??= [] ).push( {
		handlers: { math: mathToMarkdown().handlers?.math },
		unsafe: [
			{
				atBreak: true,
				character: '$',
				after: '\\$[^$\\r\\n]*(?:[\\r\\n]|$)',
			},
		],
	} );
}
