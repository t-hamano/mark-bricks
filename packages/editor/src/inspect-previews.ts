/**
 * Internal dependencies
 */
import {
	MATH_LANGUAGE,
	MERMAID_LANGUAGE,
} from './block-library/hooks/code-languages';
import type {
	CodePreviewReport,
	CodePreviewStatus,
} from './code-preview-report';

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
		canvas.querySelectorAll< HTMLElement >(
			'.wp-block-code, .wp-block-math'
		)
	).flatMap( ( block ) => {
		const isMath = block.classList.contains( 'wp-block-math' );
		const language = isMath
			? MATH_LANGUAGE
			: ( block.dataset.language ?? '' ).trim().toLowerCase();
		if ( ! isMath && language !== MERMAID_LANGUAGE ) {
			return [];
		}
		const className = isMath ? 'wp-block-math' : 'wp-block-code';
		let status: CodePreviewStatus = 'pending';
		if ( block.querySelector( `.${ className }__preview-error` ) ) {
			status = 'error';
		} else if (
			block.querySelector( `.${ className }__preview-content` )
		) {
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
