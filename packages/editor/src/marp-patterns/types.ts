/**
 * Name of a group of slide patterns, by the layout they share, such as title
 * slides or slides with images.
 * `SLIDE_PATTERN_CATEGORIES` lists them, with their labels.
 */
export type SlidePatternCategory =
	'title' | 'text' | 'list' | 'image' | 'table' | 'code';

/**
 * A ready-made set of slides that the inserter offers in Marp mode.
 *
 * The text people read is kept out of `markdown`, so it can be translated:
 * `markdown` holds a `{{key}}` placeholder in its place, and `strings` maps
 * each key to the translated text. The title and strings are functions, so
 * they are translated with the locale set when the editor reads them, not
 * when the module loads.
 */
export type SlidePattern = {
	// Unique identifier, in kebab-case.
	name: string;
	// Label shown in the inserter.
	title: () => string;
	// The groups the pattern belongs to, the one it fits best first.
	categories: readonly SlidePatternCategory[];
	// Markdown of the slides, without front matter. Slides are separated by
	// `---`, and translatable text is written as `{{key}}`.
	markdown: string;
	// Plain text for each placeholder in `markdown`.
	strings: () => Record< string, string >;
};
