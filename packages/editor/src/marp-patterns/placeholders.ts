const PLACEHOLDER_PATTERN = /\{\{([a-zA-Z][a-zA-Z0-9]*)\}\}/g;

/**
 * Lists the placeholder keys a pattern's Markdown uses.
 *
 * @param markdown Markdown with `{{key}}` placeholders.
 * @return The keys, each once, in order of appearance.
 */
export function getPlaceholderKeys( markdown: string ): string[] {
	return [
		...new Set(
			Array.from(
				markdown.matchAll( PLACEHOLDER_PATTERN ),
				( m ) => m[ 1 ]
			)
		),
	];
}

/**
 * Escapes plain text so Markdown reads it back as the same text.
 *
 * Characters that start inline syntax are escaped wherever they are, and
 * those that only start a block, such as `-` or `1.`, at the start of the
 * text. Line breaks become spaces, since a placeholder stands for text
 * within one line. A bare URL still becomes a link, as GFM reads it even
 * when escaped.
 *
 * @param text Plain text.
 * @return The text, escaped for Markdown.
 */
export function escapeMarkdown( text: string ): string {
	return text
		.replace( /\s*[\r\n]+\s*/g, ' ' )
		.replace( /[\\`*_[\]<>#!|~&$]/g, '\\$&' )
		.replace( /^([-+=])/, '\\$1' )
		.replace( /^(\d+)([.)])/, '$1\\$2' );
}

/**
 * Replaces each `{{key}}` placeholder with its text.
 *
 * It replaces in one pass, so a placeholder within a translation stays as it
 * is. A placeholder without a text stays as it is too.
 *
 * @param source  Text with `{{key}}` placeholders.
 * @param strings Text for each key.
 * @param escape  How to escape each text for `source`'s format.
 * @return The text with the placeholders replaced.
 */
export function fillPlaceholders(
	source: string,
	strings: Record< string, string >,
	escape: ( text: string ) => string
): string {
	return source.replace( PLACEHOLDER_PATTERN, ( placeholder, key: string ) =>
		Object.prototype.hasOwnProperty.call( strings, key )
			? escape( strings[ key ] )
			: placeholder
	);
}
