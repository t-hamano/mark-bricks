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

/**
 * The font families the content area can be set to.
 */
export const FONT_FAMILIES = Object.keys( FONT_FAMILY_STACKS ) as FontFamily[];

/**
 * Whether a value is one of the font families the content area can be set
 * to.
 *
 * @param value The value to check.
 * @return Whether it is a font family.
 */
export function isFontFamily( value: unknown ): value is FontFamily {
	return (
		typeof value === 'string' &&
		Object.prototype.hasOwnProperty.call( FONT_FAMILY_STACKS, value )
	);
}

/**
 * Returns the font stack for the content area.
 *
 * @param value A font family, or a font stack, which is kept as it is.
 * @return The font stack, empty for the editor's own default font.
 */
export function getFontFamilyStack( value: string ): string {
	return isFontFamily( value ) ? FONT_FAMILY_STACKS[ value ] : value;
}
