/**
 * Internal dependencies
 */
import type { CodePreviewStatus } from '../../inspect-previews';
import { MATH_LANGUAGE } from '../hooks/code-languages';

/**
 * Reports how the preview of each math block in the block canvas rendered,
 * in document order. Each is reported with the language `math`.
 *
 * @param canvas The block canvas.
 * @return The status of each preview.
 */
export function getMathPreviews( canvas: HTMLElement ) {
	return Array.from(
		canvas.querySelectorAll< HTMLElement >( '.wp-block-math' )
	).map( ( block ) => {
		let status: CodePreviewStatus = 'pending';
		if ( block.querySelector( '.wp-block-math__preview-error' ) ) {
			status = 'error';
		} else if ( block.querySelector( '.wp-block-math__preview-content' ) ) {
			status = 'rendered';
		}
		return { language: MATH_LANGUAGE, status };
	} );
}

/**
 * Reports the KaTeX fonts the block canvas has started to load, and how that
 * went. A font the app cannot reach, for example because of its CSP, is
 * `error`.
 *
 * @param canvas The block canvas.
 * @return The family and load status of each font.
 */
export function getKatexFonts( canvas: HTMLElement ) {
	const fonts: Array< { family: string; status: FontFaceLoadStatus } > = [];
	canvas.ownerDocument.fonts.forEach( ( font ) => {
		if ( font.family.includes( 'KaTeX_' ) && font.status !== 'unloaded' ) {
			fonts.push( { family: font.family, status: font.status } );
		}
	} );
	return fonts;
}
