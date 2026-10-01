/**
 * Internal dependencies
 */
import type { CodePreviewStatus } from '../../inspect-previews';
import { MERMAID_LANGUAGE } from '../hooks/code-languages';

/**
 * Reports how the preview of each `mermaid` code block in the block canvas
 * rendered, in document order.
 *
 * @param canvas The block canvas.
 * @return The status of each preview.
 */
export function getMermaidPreviews( canvas: HTMLElement ) {
	return Array.from(
		canvas.querySelectorAll< HTMLElement >( '.wp-block-code' )
	).flatMap( ( block ) => {
		const language = ( block.dataset.language ?? '' ).trim().toLowerCase();
		if ( language !== MERMAID_LANGUAGE ) {
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
