const loadKatex = () =>
	import( 'katex' ).then( ( { default: katex } ) => katex );
let katexPromise: ReturnType< typeof loadKatex > | undefined;

type RenderMathOptions = {
	displayMode: boolean;
};

/**
 * Renders TeX to HTML, with MathML alongside for screen readers.
 *
 * KaTeX is loaded the first time a formula is rendered. The HTML is styled by
 * KaTeX's stylesheet and fonts, which the block canvas loads (see
 * `styles.ts`). `trust` stays off, so commands such as `\href` cannot inject
 * links or other HTML.
 *
 * @param tex                 TeX source of the formula.
 * @param options             Render options.
 * @param options.displayMode Whether to render a display formula rather than
 *                            an inline one.
 * @return The formula markup. Rejects when the TeX does not parse.
 */
export async function renderMath(
	tex: string,
	{ displayMode }: RenderMathOptions
) {
	const katex = await ( katexPromise ??= loadKatex() );
	return katex.renderToString( tex, {
		displayMode,
		output: 'htmlAndMathml',
		throwOnError: true,
		trust: false,
		strict: false,
	} );
}
