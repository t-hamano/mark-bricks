/**
 * Internal dependencies
 */
import { escapeMarkdown, fillPlaceholders } from './placeholders';
import type { SlidePattern } from './types';
import title from './patterns/title';
import titleInInvertedColors from './patterns/title-in-inverted-colors';
import titleOnGradient from './patterns/title-on-gradient';
import titleOnImage from './patterns/title-on-image';
import titleOnBlurredImage from './patterns/title-on-blurred-image';
import titleAndImageOnLeft from './patterns/title-and-image-on-left';
import titleAndImageOnRight from './patterns/title-and-image-on-right';
import headingAndTwoSubsections from './patterns/heading-and-two-subsections';
import headingAndTextOnImage from './patterns/heading-and-text-on-image';
import headerFooterAndPageNumber from './patterns/header-footer-and-page-number';
import quoteOnImage from './patterns/quote-on-image';
import imageOnLeftAndText from './patterns/image-on-left-and-text';
import imageOnRightAndText from './patterns/image-on-right-and-text';
import twoStackedImagesAndText from './patterns/two-stacked-images-and-text';
import headingImageAndCaption from './patterns/heading-image-and-caption';
import headingAndTwoImages from './patterns/heading-and-two-images';
import fullScreenImage from './patterns/full-screen-image';
import twoImagesSideBySide from './patterns/two-images-side-by-side';
import threeImagesSideBySide from './patterns/three-images-side-by-side';
import twoStackedImages from './patterns/two-stacked-images';

export type { SlidePattern, SlidePatternCategory } from './types';
export { SLIDE_PATTERN_CATEGORIES } from './categories';

// In the order the inserter lists them: grouped by the category each fits
// best, in the order of `SLIDE_PATTERN_CATEGORIES`.
export const SLIDE_PATTERNS: readonly SlidePattern[] = [
	title,
	titleInInvertedColors,
	titleOnGradient,
	titleOnImage,
	titleOnBlurredImage,
	titleAndImageOnLeft,
	titleAndImageOnRight,
	headingAndTwoSubsections,
	headingAndTextOnImage,
	headerFooterAndPageNumber,
	quoteOnImage,
	imageOnLeftAndText,
	imageOnRightAndText,
	twoStackedImagesAndText,
	headingImageAndCaption,
	headingAndTwoImages,
	fullScreenImage,
	twoImagesSideBySide,
	threeImagesSideBySide,
	twoStackedImages,
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
