/**
 * Internal dependencies
 */
import { getMermaidPreviews } from './block-library/code/inspect-previews';
import {
	getKatexFonts,
	getMathPreviews,
} from './block-library/math/inspect-previews';

export type CodePreviewStatus = 'rendered' | 'error' | 'pending';

export type CodePreviewReport = {
	/**
	 * The preview of each math block and `mermaid` code block. A math block
	 * is reported with the language `math`. `pending` means it had not
	 * rendered when the wait timed out.
	 */
	previews: Array< { language: string; status: CodePreviewStatus } >;
	/**
	 * The KaTeX fonts the canvas has started to load, and how that went. A
	 * font the app cannot reach, for example because of its CSP, is `error`.
	 */
	katexFonts: Array< { family: string; status: FontFaceLoadStatus } >;
};

function getPreviews( canvas: HTMLElement ) {
	return [ ...getMathPreviews( canvas ), ...getMermaidPreviews( canvas ) ];
}

/**
 * Reports how the previews of the math and code blocks in the block canvas
 * rendered, for the apps' smoke tests.
 *
 * @param canvas          The block canvas, as passed to `onRendered`.
 * @param options         Options.
 * @param options.timeout Milliseconds to wait for the previews to render.
 * @return The report, once every preview has rendered or failed to, the
 *         fonts they use have loaded, or the wait has timed out.
 */
export async function inspectCodePreviews(
	canvas: HTMLElement,
	{ timeout = 30000 }: { timeout?: number } = {}
): Promise< CodePreviewReport > {
	await waitFor( canvas, timeout, () =>
		getPreviews( canvas ).every( ( { status } ) => status !== 'pending' )
	);

	// Lay out the previews so that the fonts they use start loading.
	void canvas.offsetHeight;
	await canvas.ownerDocument.fonts.ready;

	return {
		previews: getPreviews( canvas ),
		katexFonts: getKatexFonts( canvas ),
	};
}

function waitFor(
	canvas: HTMLElement,
	timeout: number,
	condition: () => boolean
) {
	return new Promise< void >( ( resolve ) => {
		if ( condition() ) {
			resolve();
			return;
		}
		const finish = () => {
			observer.disconnect();
			clearTimeout( timer );
			resolve();
		};
		const observer = new MutationObserver( () => {
			if ( condition() ) {
				finish();
			}
		} );
		const timer = setTimeout( finish, timeout );
		observer.observe( canvas, { childList: true, subtree: true } );
	} );
}
