/**
 * External dependencies
 */
import { LanguageDescription, LanguageSupport } from '@codemirror/language';
import { languages } from '@codemirror/language-data';

export const MERMAID_LANGUAGE = 'mermaid';
export const MATH_LANGUAGE = 'math';

const mermaidLanguageDescription = LanguageDescription.of( {
	name: MERMAID_LANGUAGE,
	load: () =>
		import( 'codemirror-lang-mermaid' ).then(
			( { mermaidLanguage } ) => new LanguageSupport( mermaidLanguage )
		),
} );

// A `math` block holds TeX, as on GitHub, so it is highlighted as LaTeX.
const latexLanguageDescription = languages.find(
	( language ) => language.name === 'LaTeX'
);
const mathLanguageDescription = LanguageDescription.of( {
	name: MATH_LANGUAGE,
	load: () =>
		latexLanguageDescription
			? latexLanguageDescription.load()
			: Promise.reject( new Error( 'LaTeX is not available.' ) ),
} );

/**
 * The languages a code block can be highlighted in: everything CodeMirror
 * ships with, plus mermaid and math, which it has no mode for.
 */
export const CODE_LANGUAGES: LanguageDescription[] = [
	...languages,
	mermaidLanguageDescription,
	mathLanguageDescription,
];
