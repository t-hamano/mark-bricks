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
import titleWithLabel from './patterns/title-with-label';
import titleWithLabelAndImage from './patterns/title-with-label-and-image';
import headingAndText from './patterns/heading-and-text';
import headingSubheadingAndText from './patterns/heading-subheading-and-text';
import headingAndTwoSubsections from './patterns/heading-and-two-subsections';
import quote from './patterns/quote';
import headingAndQuote from './patterns/heading-and-quote';
import quoteOnImage from './patterns/quote-on-image';
import bulletedList from './patterns/bulleted-list';
import orderedList from './patterns/ordered-list';
import nestedList from './patterns/nested-list';
import labeledList from './patterns/labeled-list';
import linkList from './patterns/link-list';
import textAndList from './patterns/text-and-list';
import imageOnLeftAndText from './patterns/image-on-left-and-text';
import imageOnRightAndText from './patterns/image-on-right-and-text';
import imageOnLeftAndList from './patterns/image-on-left-and-list';
import imageOnRightAndList from './patterns/image-on-right-and-list';
import twoStackedImagesAndText from './patterns/two-stacked-images-and-text';
import headingImageAndCaption from './patterns/heading-image-and-caption';
import headingAndTwoImages from './patterns/heading-and-two-images';
import fullScreenImage from './patterns/full-screen-image';
import twoImagesSideBySide from './patterns/two-images-side-by-side';
import threeImagesSideBySide from './patterns/three-images-side-by-side';
import twoStackedImages from './patterns/two-stacked-images';
import twoColumnTable from './patterns/two-column-table';
import threeColumnTable from './patterns/three-column-table';
import fourColumnTable from './patterns/four-column-table';
import headingAndCode from './patterns/heading-and-code';
import headingCodeAndText from './patterns/heading-code-and-text';

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
	titleWithLabel,
	titleWithLabelAndImage,
	headingAndText,
	headingSubheadingAndText,
	headingAndTwoSubsections,
	quote,
	headingAndQuote,
	quoteOnImage,
	bulletedList,
	orderedList,
	nestedList,
	labeledList,
	linkList,
	textAndList,
	imageOnLeftAndText,
	imageOnRightAndText,
	imageOnLeftAndList,
	imageOnRightAndList,
	twoStackedImagesAndText,
	headingImageAndCaption,
	headingAndTwoImages,
	fullScreenImage,
	twoImagesSideBySide,
	threeImagesSideBySide,
	twoStackedImages,
	twoColumnTable,
	threeColumnTable,
	fourColumnTable,
	headingAndCode,
	headingCodeAndText,
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
