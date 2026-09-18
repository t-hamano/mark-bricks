/**
 * External dependencies
 */
import { LanguageDescription, LanguageSupport } from '@codemirror/language';
import { languages } from '@codemirror/language-data';

export const MERMAID_LANGUAGE = 'mermaid';

const mermaidLanguageDescription = LanguageDescription.of( {
	name: MERMAID_LANGUAGE,
	load: () =>
		import( 'codemirror-lang-mermaid' ).then(
			( { mermaidLanguage } ) => new LanguageSupport( mermaidLanguage )
		),
} );

/**
 * The languages a code block can be highlighted in: everything CodeMirror
 * ships with, plus mermaid, which it has no mode for.
 */
export const CODE_LANGUAGES: LanguageDescription[] = [
	...languages,
	mermaidLanguageDescription,
];
