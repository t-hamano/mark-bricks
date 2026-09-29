/**
 * External dependencies
 */
import katexCss from 'katex/dist/katex.min.css?raw';
import AMSRegular from 'katex/dist/fonts/KaTeX_AMS-Regular.woff2?url&no-inline';
import CaligraphicBold from 'katex/dist/fonts/KaTeX_Caligraphic-Bold.woff2?url&no-inline';
import CaligraphicRegular from 'katex/dist/fonts/KaTeX_Caligraphic-Regular.woff2?url&no-inline';
import FrakturBold from 'katex/dist/fonts/KaTeX_Fraktur-Bold.woff2?url&no-inline';
import FrakturRegular from 'katex/dist/fonts/KaTeX_Fraktur-Regular.woff2?url&no-inline';
import MainBold from 'katex/dist/fonts/KaTeX_Main-Bold.woff2?url&no-inline';
import MainBoldItalic from 'katex/dist/fonts/KaTeX_Main-BoldItalic.woff2?url&no-inline';
import MainItalic from 'katex/dist/fonts/KaTeX_Main-Italic.woff2?url&no-inline';
import MainRegular from 'katex/dist/fonts/KaTeX_Main-Regular.woff2?url&no-inline';
import MathBoldItalic from 'katex/dist/fonts/KaTeX_Math-BoldItalic.woff2?url&no-inline';
import MathItalic from 'katex/dist/fonts/KaTeX_Math-Italic.woff2?url&no-inline';
import SansSerifBold from 'katex/dist/fonts/KaTeX_SansSerif-Bold.woff2?url&no-inline';
import SansSerifItalic from 'katex/dist/fonts/KaTeX_SansSerif-Italic.woff2?url&no-inline';
import SansSerifRegular from 'katex/dist/fonts/KaTeX_SansSerif-Regular.woff2?url&no-inline';
import ScriptRegular from 'katex/dist/fonts/KaTeX_Script-Regular.woff2?url&no-inline';
import Size1Regular from 'katex/dist/fonts/KaTeX_Size1-Regular.woff2?url&no-inline';
import Size2Regular from 'katex/dist/fonts/KaTeX_Size2-Regular.woff2?url&no-inline';
import Size3Regular from 'katex/dist/fonts/KaTeX_Size3-Regular.woff2?url&no-inline';
import Size4Regular from 'katex/dist/fonts/KaTeX_Size4-Regular.woff2?url&no-inline';
import TypewriterRegular from 'katex/dist/fonts/KaTeX_Typewriter-Regular.woff2?url&no-inline';

/**
 * The WOFF2 file of each KaTeX font, as a URL the bundler resolves for the
 * app it is built into. `no-inline` keeps even the smallest font a file: a
 * `data:` URI would be refused by the Tauri app's `font-src 'self'`.
 */
export const KATEX_FONT_URLS: Record< string, string > = {
	'KaTeX_AMS-Regular': AMSRegular,
	'KaTeX_Caligraphic-Bold': CaligraphicBold,
	'KaTeX_Caligraphic-Regular': CaligraphicRegular,
	'KaTeX_Fraktur-Bold': FrakturBold,
	'KaTeX_Fraktur-Regular': FrakturRegular,
	'KaTeX_Main-Bold': MainBold,
	'KaTeX_Main-BoldItalic': MainBoldItalic,
	'KaTeX_Main-Italic': MainItalic,
	'KaTeX_Main-Regular': MainRegular,
	'KaTeX_Math-BoldItalic': MathBoldItalic,
	'KaTeX_Math-Italic': MathItalic,
	'KaTeX_SansSerif-Bold': SansSerifBold,
	'KaTeX_SansSerif-Italic': SansSerifItalic,
	'KaTeX_SansSerif-Regular': SansSerifRegular,
	'KaTeX_Script-Regular': ScriptRegular,
	'KaTeX_Size1-Regular': Size1Regular,
	'KaTeX_Size2-Regular': Size2Regular,
	'KaTeX_Size3-Regular': Size3Regular,
	'KaTeX_Size4-Regular': Size4Regular,
	'KaTeX_Typewriter-Regular': TypewriterRegular,
};

/**
 * Matches the `src` of a KaTeX `@font-face` rule, which lists the same font as
 * WOFF2, WOFF, and TrueType files relative to the stylesheet.
 */
const FONT_SRC_PATTERN = /src:url\(fonts\/(KaTeX_[\w-]+)\.woff2\)[^;}]*/g;

/**
 * Points each font of a KaTeX stylesheet at its WOFF2 file only.
 *
 * Every browser the apps run in reads WOFF2, so leaving out the WOFF and
 * TrueType fallbacks keeps them out of the app bundles. The URLs come from
 * the bundler, which makes them resolve from the block canvas as well: the
 * canvas document has a `<base>` of the editor page.
 *
 * @param css KaTeX's stylesheet.
 * @return The stylesheet with the rewritten font sources. A font missing from
 *         {@link KATEX_FONT_URLS} keeps its original sources.
 */
export function rewriteFontSources( css: string ): string {
	return css.replace( FONT_SRC_PATTERN, ( match, name: string ) =>
		name in KATEX_FONT_URLS
			? `src:url(${ KATEX_FONT_URLS[ name ] }) format("woff2")`
			: match
	);
}

/**
 * KaTeX's stylesheet for the block canvas.
 */
export const katexStyles = rewriteFontSources( katexCss );
