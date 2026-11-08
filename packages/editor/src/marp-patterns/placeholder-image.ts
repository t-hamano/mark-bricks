/**
 * `data:` URI of a neutral picture of a landscape, for patterns to show where
 * an image goes.
 *
 * It is embedded in the Markdown, so it shows offline and in every host, and
 * depends on no external URL or license. Keep it small: every inserted
 * pattern writes it into the user's document. It is base64-encoded, because
 * the spaces and parentheses of a URL-encoded SVG would end the Markdown
 * image's URL early.
 */
export const PLACEHOLDER_IMAGE = `data:image/svg+xml;base64,${ btoa(
	'<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">' +
		'<rect width="1280" height="720" fill="#d9dde3"/>' +
		'<circle cx="840" cy="250" r="70" fill="#b4bbc5"/>' +
		'<path d="M0 720l380-330 230 200 150-120 520 250z" fill="#b4bbc5"/>' +
		'</svg>'
) }`;
