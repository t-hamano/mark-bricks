/**
 * Font stacks the content area can be set to, keyed by font family. Kept free
 * of dependencies so the VS Code extension host can import it to validate
 * settings. An empty stack leaves the editor's own default font in place.
 */
export const FONT_FAMILY_STACKS = {
	system: '',
	'sans-serif':
		"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', Arial, sans-serif",
	serif: "Georgia, Cambria, 'Times New Roman', Times, serif",
	monospace:
		"ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, 'Liberation Mono', 'Courier New', monospace",
	handwriting:
		"'Comic Sans MS', 'Comic Sans', 'Chalkboard SE', 'Marker Felt', cursive",
} as const satisfies Record< string, string >;

export type FontFamily = keyof typeof FONT_FAMILY_STACKS;
