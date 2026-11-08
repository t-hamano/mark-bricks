/**
 * A ready-made set of slides that the inserter offers in Marp mode.
 *
 * The text people read is kept out of `markdown`, so it can be translated:
 * `markdown` holds a `{{key}}` placeholder in its place, and `strings` maps
 * each key to the translated text. The labels and strings are functions, so
 * they are translated with the locale set when the editor reads them, not
 * when the module loads.
 */
export type SlidePattern = {
	// Unique identifier, in kebab-case.
	name: string;
	// Label shown in the inserter.
	title: () => string;
	// Extra words the inserter's search matches.
	keywords: () => string[];
	// Markdown of the slides, without front matter. Slides are separated by
	// `---`, and translatable text is written as `{{key}}`.
	markdown: string;
	// Plain text for each placeholder in `markdown`.
	strings: () => Record< string, string >;
};
