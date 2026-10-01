/**
 * External dependencies
 */
import { useEffect, useRef } from 'react';
import { emitTo, listen } from '@tauri-apps/api/event';

/**
 * Internal dependencies
 */
import {
	PREVIEW_MARKDOWN_EVENT,
	PREVIEW_READY_EVENT,
	PREVIEW_WINDOW,
} from '../preview/constants';

function sendToPreview( markdown: string ) {
	void emitTo( PREVIEW_WINDOW, PREVIEW_MARKDOWN_EVENT, markdown );
}

/**
 * Keeps the slide preview window showing the active document: sends it each
 * time it changes, and when the preview window opens.
 *
 * @param markdown Markdown of the active document.
 */
export default function usePreviewSync( markdown: string ) {
	const markdownRef = useRef( markdown );
	markdownRef.current = markdown;

	useEffect( () => {
		const unlisten = listen( PREVIEW_READY_EVENT, () =>
			sendToPreview( markdownRef.current )
		);
		return () => {
			void unlisten.then( ( fn ) => fn() );
		};
	}, [] );

	useEffect( () => {
		sendToPreview( markdown );
	}, [ markdown ] );
}
