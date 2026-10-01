/**
 * Internal dependencies
 */
import {
	MATH_LANGUAGE,
	MERMAID_LANGUAGE,
} from './block-library/hooks/code-languages';

const PREVIEW_LANGUAGES = [ MATH_LANGUAGE, MERMAID_LANGUAGE ];

export type CodePreviewStatus = 'rendered' | 'error' | 'pending';

export type CodePreviewReport = {
	/**
	 * The preview of each `math` and `mermaid` code block, in document order.
	 * `pending` means it had not rendered when the wait timed out.
	 */
	previews: Array< { language: string; status: CodePreviewStatus } >;
	/**
	 * The KaTeX fonts the canvas has started to load, and how that went. A
	 * font the app cannot reach, for example because of its CSP, is `error`.
	 */
	katexFonts: Array< { family: string; status: FontFaceLoadStatus } >;
};

/**
 * Reports how the previews of the code blocks in the block canvas rendered,
 * for the apps' smoke tests.
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

	const katexFonts: CodePreviewReport[ 'katexFonts' ] = [];
	canvas.ownerDocument.fonts.forEach( ( font ) => {
		if ( font.family.includes( 'KaTeX_' ) && font.status !== 'unloaded' ) {
			katexFonts.push( { family: font.family, status: font.status } );
		}
	} );

	return { previews: getPreviews( canvas ), katexFonts };
}

function getPreviews( canvas: HTMLElement ) {
	return Array.from(
		canvas.querySelectorAll< HTMLElement >( '.wp-block-code' )
	).flatMap( ( block ) => {
		const language = ( block.dataset.language ?? '' ).trim().toLowerCase();
		if ( ! PREVIEW_LANGUAGES.includes( language ) ) {
			return [];
		}
		let status: CodePreviewStatus = 'pending';
		if ( block.querySelector( '.wp-block-code__preview-error' ) ) {
			status = 'error';
		} else if ( block.querySelector( '.wp-block-code__preview-content' ) ) {
			status = 'rendered';
		}
		return [ { language, status } ];
	} );
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
