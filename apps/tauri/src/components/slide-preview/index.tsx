/**
 * External dependencies
 */
import type { RefObject } from 'react';
import { getLocale } from '@mark-bricks/editor/locale';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { PREVIEW_PAGE } from '../../preview/constants';
import './style.scss';

type Props = {
	frameRef: RefObject< HTMLIFrameElement | null >;
	isSlideMode: boolean;
};

/**
 * Shows the slides of the active deck next to the editor, in a frame of
 * their own that keeps their styles and keys apart from the editor's. In the
 * slide mode, the frame fills the window.
 *
 * @param props             Component props.
 * @param props.frameRef    Ref of the frame, which the preview sync talks to.
 * @param props.isSlideMode Whether the frame fills the window.
 */
export default function SlidePreview( { frameRef, isSlideMode }: Props ) {
	return (
		<iframe
			ref={ frameRef }
			className={
				isSlideMode ? 'slide-preview is-slide-mode' : 'slide-preview'
			}
			title={ __( 'Slide Preview', 'mark-bricks' ) }
			src={ `${ PREVIEW_PAGE }?placement=panel&locale=${ encodeURIComponent(
				getLocale()
			) }` }
		/>
	);
}
