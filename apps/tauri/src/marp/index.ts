// Leading YAML front matter, matched the same way the editor splits it off.
const FRONT_MATTER_PATTERN =
	/^\uFEFF?---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)/;

// A top-level `marp: true`, optionally followed by a YAML comment.
const MARP_DIRECTIVE_PATTERN = /^marp[ \t]*:[ \t]+true[ \t]*(?:#.*)?$/m;

/**
 * Whether a Markdown document is a Marp slide deck, which it is when its
 * front matter contains `marp: true`.
 *
 * @param markdown Markdown document.
 * @return Whether the document is a Marp slide deck.
 */
export function isMarpDocument( markdown: string ): boolean {
	const frontMatter = FRONT_MATTER_PATTERN.exec( markdown )?.[ 1 ];
	return (
		frontMatter !== undefined &&
		MARP_DIRECTIVE_PATTERN.test( frontMatter.replace( /\r\n?/g, '\n' ) )
	);
}
