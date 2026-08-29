/**
 * External dependencies
 */
import {
	HighlightStyle,
	LanguageDescription,
	LanguageSupport,
	syntaxHighlighting,
} from '@codemirror/language';
import { languages } from '@codemirror/language-data';

// Info string of a code block holding a diagram, matching the one GitHub and
// the other markdown renderers understand.
export const MERMAID_LANGUAGE = 'mermaid';

// The palette of `defaultHighlightStyle`, so diagrams are highlighted in the
// same colors as every other language.
const KEYWORD = '#708';
const NAME = '#219';
const NUMBER = '#164';
const STRING = '#a11';
const OPERATOR = '#085';
const COMMENT = '#940';

function importMermaid() {
	return import( 'codemirror-lang-mermaid' );
}

type MermaidModule = Awaited< ReturnType< typeof importMermaid > >;

/**
 * Builds the highlight style covering every mermaid diagram grammar.
 *
 * @param module The loaded `codemirror-lang-mermaid` module.
 * @return The highlight style for the tags of that module.
 */
function mermaidHighlightStyle( module: MermaidModule ) {
	const {
		mermaidTags,
		mindmapTags,
		pieTags,
		flowchartTags,
		sequenceTags,
		journeyTags,
		requirementTags,
		ganttTags,
	} = module;
	return HighlightStyle.define( [
		{
			tag: [
				mermaidTags.diagramName,
				mindmapTags.diagramName,
				pieTags.diagramName,
				pieTags.showData,
				pieTags.title,
				flowchartTags.diagramName,
				flowchartTags.keyword,
				sequenceTags.diagramName,
				sequenceTags.keyword1,
				sequenceTags.keyword2,
				journeyTags.diagramName,
				journeyTags.keyword,
				requirementTags.diagramName,
				requirementTags.keyword,
				ganttTags.diagramName,
				ganttTags.keyword,
			],
			color: KEYWORD,
		},
		{
			tag: [
				mindmapTags.lineText1,
				mindmapTags.lineText2,
				mindmapTags.lineText3,
				mindmapTags.lineText4,
				mindmapTags.lineText5,
				flowchartTags.nodeId,
				sequenceTags.position,
				journeyTags.actor,
			],
			color: NAME,
		},
		{
			tag: [
				pieTags.number,
				flowchartTags.number,
				journeyTags.score,
				requirementTags.number,
			],
			color: NUMBER,
		},
		{
			tag: [
				pieTags.string,
				pieTags.titleText,
				flowchartTags.nodeText,
				flowchartTags.nodeEdgeText,
				flowchartTags.string,
				sequenceTags.messageText1,
				sequenceTags.messageText2,
				sequenceTags.nodeText,
				journeyTags.text,
				requirementTags.quotedString,
				requirementTags.unquotedString,
				ganttTags.string,
			],
			color: STRING,
		},
		{
			tag: [
				flowchartTags.link,
				flowchartTags.nodeEdge,
				flowchartTags.orientation,
				sequenceTags.arrow,
				requirementTags.arrow,
			],
			color: OPERATOR,
		},
		{
			tag: [
				pieTags.lineComment,
				flowchartTags.lineComment,
				sequenceTags.lineComment,
				journeyTags.lineComment,
				requirementTags.lineComment,
				ganttTags.lineComment,
			],
			color: COMMENT,
		},
	] );
}

const mermaidLanguageDescription = LanguageDescription.of( {
	name: MERMAID_LANGUAGE,
	load: () =>
		importMermaid().then(
			( module ) =>
				new LanguageSupport( module.mermaidLanguage, [
					syntaxHighlighting( mermaidHighlightStyle( module ) ),
				] )
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
