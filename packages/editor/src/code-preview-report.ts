// Kept free of the DOM types, so that the VS Code extension host, which is
// built without them, can use what `inspectCodePreviews` reports.

export type CodePreviewStatus = 'rendered' | 'error' | 'pending';

// The values of the DOM's `FontFaceLoadStatus`.
export type FontLoadStatus = 'unloaded' | 'loading' | 'loaded' | 'error';

export type CodePreviewReport = {
	/**
	 * The preview of each math block and `mermaid` code block, in document
	 * order. A math block is reported with the language `math`. `pending`
	 * means it had not rendered when the wait timed out.
	 */
	previews: Array< { language: string; status: CodePreviewStatus } >;
	/**
	 * The KaTeX fonts the canvas has started to load, and how that went. A
	 * font the app cannot reach, for example because of its CSP, is `error`.
	 */
	katexFonts: Array< { family: string; status: FontLoadStatus } >;
};
