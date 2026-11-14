/**
 * External dependencies
 */
import { useEffect, useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { createSlidePreview } from '@mark-bricks/marp-preview/controls';
import { renderSlides } from '@mark-bricks/marp-preview/render';

/**
 * Internal dependencies
 */
import { SLIDE_PREVIEW_READY, type SlidePreviewMessage } from './messages';

/**
 * The page of the slide preview that the editor's stories show in a frame
 * next to the editor, as the app does. The frame keeps the preview's page
 * styles and keys away from the editor. It renders the Markdown that the story
 * sends it.
 */
function SlidePreviewFrame() {
	const containerRef = useRef< HTMLDivElement >( null );

	useEffect( () => {
		const container = containerRef.current;
		if ( ! container ) {
			return;
		}
		const preview = createSlidePreview( container );
		function onMessage( event: MessageEvent< SlidePreviewMessage > ) {
			if (
				event.origin === location.origin &&
				event.data?.type === 'markdown'
			) {
				const { markdown } = event.data;
				preview.render( () => renderSlides( markdown ) );
			}
		}
		window.addEventListener( 'message', onMessage );
		window.parent.postMessage( SLIDE_PREVIEW_READY, location.origin );
		return () => window.removeEventListener( 'message', onMessage );
	}, [] );

	return <div ref={ containerRef } />;
}

const meta: Meta = {
	title: 'Internal/Slide Preview Frame',
	component: SlidePreviewFrame,
	// Only the editor's stories show it, in their frame.
	tags: [ '!dev', '!autodocs' ],
	parameters: { layout: 'fullscreen' },
};

export default meta;

export const Default: StoryObj = {};
