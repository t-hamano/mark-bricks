/**
 * Internal dependencies
 */
import { escapeMarkdown, fillPlaceholders } from './placeholders';
import type { SlidePattern } from './types';
import title from './patterns/title';
import agenda from './patterns/agenda';
import section from './patterns/section';
import imageAndText from './patterns/image-and-text';
import closing from './patterns/closing';

export type { SlidePattern } from './types';

// In the order the inserter lists them.
export const SLIDE_PATTERNS: readonly SlidePattern[] = [
	title,
	agenda,
	section,
	imageAndText,
	closing,
];

/**
 * Returns a pattern's Markdown with its text in the current locale.
 *
 * @param pattern The pattern.
 * @return Markdown of the pattern's slides, ready to convert to blocks.
 */
export function getSlidePatternMarkdown( pattern: SlidePattern ): string {
	return fillPlaceholders(
		pattern.markdown,
		pattern.strings(),
		escapeMarkdown
	);
}
