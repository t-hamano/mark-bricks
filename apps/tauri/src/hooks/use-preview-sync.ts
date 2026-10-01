/**
 * External dependencies
 */
import { useEffect, useMemo, useRef } from 'react';
import { emitTo, listen } from '@tauri-apps/api/event';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { isMarpDocument } from '../marp';
import {
	PREVIEW_DOCUMENT_EVENT,
	PREVIEW_READY_EVENT,
	PREVIEW_WINDOW,
	type PreviewPayload,
} from '../preview/constants';
import type { Tab } from '../store';

function sendToPreview( payload: PreviewPayload ) {
	void emitTo( PREVIEW_WINDOW, PREVIEW_DOCUMENT_EVENT, payload );
}

/**
 * Keeps the slide preview window showing the active document: sends it each
 * time it changes, and when the preview window opens.
 *
 * @param activeTab The active tab, if any.
 */
export default function usePreviewSync( activeTab: Tab | undefined ) {
	const markdown = activeTab?.content ?? '';
	const documentPath = activeTab?.filePath;
	const payload = useMemo< PreviewPayload >( () => {
		const labels = {
			enterFullscreen: __( 'Enter full screen', 'mark-bricks' ),
			exitFullscreen: __( 'Exit full screen', 'mark-bricks' ),
			exitFullscreenHint: __(
				'Press Escape to exit full screen',
				'mark-bricks'
			),
		};
		return isMarpDocument( markdown )
			? { labels, markdown, documentPath }
			: { labels, notice: __( 'Not a Marp document', 'mark-bricks' ) };
	}, [ markdown, documentPath ] );

	const payloadRef = useRef( payload );
	payloadRef.current = payload;

	useEffect( () => {
		const unlisten = listen( PREVIEW_READY_EVENT, () =>
			sendToPreview( payloadRef.current )
		);
		return () => {
			void unlisten.then( ( fn ) => fn() );
		};
	}, [] );

	useEffect( () => {
		sendToPreview( payload );
	}, [ payload ] );
}
