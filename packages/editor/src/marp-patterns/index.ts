/**
 * Internal dependencies
 */
import { escapeMarkdown, fillPlaceholders } from './placeholders';
import type { SlidePattern } from './types';
import title from './patterns/title';
import titleAndBackgroundImage from './patterns/title-and-background-image';
import titleAndImage from './patterns/title-and-image';
import titleOnGradient from './patterns/title-on-gradient';
import section from './patterns/section';
import numberedSection from './patterns/numbered-section';
import sectionAndImage from './patterns/section-and-image';
import agenda from './patterns/agenda';
import bulletList from './patterns/bullet-list';
import nestedList from './patterns/nested-list';
import headingAndParagraph from './patterns/heading-and-paragraph';
import steps from './patterns/steps';
import keyMessage from './patterns/key-message';
import quote from './patterns/quote';
import imageAndText from './patterns/image-and-text';
import imageOnLeftAndText from './patterns/image-on-left-and-text';
import stackedImagesAndText from './patterns/stacked-images-and-text';
import imageAndCaption from './patterns/image-and-caption';
import fullImage from './patterns/full-image';
import imageGallery from './patterns/image-gallery';
import quoteOnImage from './patterns/quote-on-image';
import table from './patterns/table';
import timeline from './patterns/timeline';
import keyFigure from './patterns/key-figure';
import code from './patterns/code';
import closing from './patterns/closing';
import questions from './patterns/questions';
import closingOnImage from './patterns/closing-on-image';
import resources from './patterns/resources';

export type { SlidePattern, SlidePatternCategory } from './types';
export { SLIDE_PATTERN_CATEGORIES } from './categories';

// In the order the inserter lists them: grouped by the category each fits
// best, in the order of `SLIDE_PATTERN_CATEGORIES`.
export const SLIDE_PATTERNS: readonly SlidePattern[] = [
	title,
	titleAndBackgroundImage,
	titleAndImage,
	titleOnGradient,
	section,
	numberedSection,
	sectionAndImage,
	agenda,
	bulletList,
	nestedList,
	headingAndParagraph,
	steps,
	keyMessage,
	quote,
	imageAndText,
	imageOnLeftAndText,
	stackedImagesAndText,
	imageAndCaption,
	fullImage,
	imageGallery,
	quoteOnImage,
	table,
	timeline,
	keyFigure,
	code,
	closing,
	questions,
	closingOnImage,
	resources,
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

export {
	SLIDE_PATTERN_THEMES,
	type SlidePatternPreviews,
	type SlidePatternTheme,
} from './previews';
