// `---` fences at the start of the document. The content may be empty.
const FRONT_MATTER_PATTERN =
	/^---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)/;

export type SplitFrontMatterResult = {
	// `null` when the document has no front matter.
	frontMatter: string | null;
	body: string;
};

/**
 * Splits leading YAML front matter off a Markdown document, since
 * remark-parse would read its fences as a thematic break and a heading.
 *
 * @param markdown Markdown document, possibly starting with front matter.
 * @return The front matter content and the remaining body.
 */
export function splitFrontMatter( markdown: string ): SplitFrontMatterResult {
	const match = FRONT_MATTER_PATTERN.exec( markdown );
	if ( ! match ) {
		return { frontMatter: null, body: markdown };
	}
	return {
		frontMatter: ( match[ 1 ] ?? '' ).replace( /\r\n?/g, '\n' ),
		body: markdown.slice( match[ 0 ].length ),
	};
}

/**
 * Prepends YAML front matter to a Markdown body. Inverse of
 * {@link splitFrontMatter}.
 *
 * @param frontMatter YAML content, or `null` to leave the body as it is.
 * @param body        Markdown body.
 * @return The Markdown document.
 */
export function joinFrontMatter(
	frontMatter: string | null,
	body: string
): string {
	if ( frontMatter === null ) {
		return body;
	}
	const block =
		frontMatter === '' ? '---\n---\n' : `---\n${ frontMatter }\n---\n`;
	return body === '' ? block : `${ block }\n${ body }`;
}
