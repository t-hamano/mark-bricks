/**
 * External dependencies
 */
import { useEffect, useRef } from 'react';

/**
 * Internal dependencies
 */
import { SLIDE_PREVIEW_STORY_ID, type SlidePreviewMessage } from './messages';

type Props = {
	// The Markdown of the deck to show.
	markdown: string;
};

/**
 * A frame that shows the slides of a Marp deck, as the app's slide preview
 * does. The editor's stories show it in their side panel, and the slide
 * patterns' story shows every pattern in it.
 *
 * @param props          Component props.
 * @param props.markdown The Markdown of the deck to show.
 */
export function SlidePreview( { markdown }: Props ) {
	const frameRef = useRef< HTMLIFrameElement >( null );
	const markdownRef = useRef( markdown );
	markdownRef.current = markdown;

	function send() {
		const message: SlidePreviewMessage = {
			type: 'markdown',
			markdown: markdownRef.current,
		};
		frameRef.current?.contentWindow?.postMessage(
			message,
			location.origin
		);
	}

	// The frame asks for the Markdown once it loads.
	useEffect( () => {
		function onMessage( event: MessageEvent< SlidePreviewMessage > ) {
			if (
				event.source === frameRef.current?.contentWindow &&
				event.data?.type === 'ready'
			) {
				send();
			}
		}
		window.addEventListener( 'message', onMessage );
		return () => window.removeEventListener( 'message', onMessage );
	}, [] );

	useEffect( send, [ markdown ] );

	return (
		<iframe
			ref={ frameRef }
			title="Slide preview"
			src={ `iframe.html?id=${ SLIDE_PREVIEW_STORY_ID }&viewMode=story` }
			style={ {
				display: 'block',
				width: '100%',
				height: '100%',
				border: 0,
			} }
		/>
	);
}
