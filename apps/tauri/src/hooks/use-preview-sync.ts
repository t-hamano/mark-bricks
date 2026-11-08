/**
 * External dependencies
 */
import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react';
import { emitTo, listen } from '@tauri-apps/api/event';
import type { EditorHandle } from '@mark-bricks/editor';
import { isMarpDocument } from '@mark-bricks/editor/marp';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import {
	PREVIEW_DOCUMENT_EVENT,
	PREVIEW_LINE_CLICK_EVENT,
	PREVIEW_READY_EVENT,
	PREVIEW_SELECTED_LINE_EVENT,
	PREVIEW_WINDOW,
	type PreviewLinePayload,
	type PreviewPayload,
} from '../preview/constants';
import type { Tab } from '../store';

function sendToPreview( event: string, payload: unknown ) {
	void emitTo( PREVIEW_WINDOW, event, payload );
}

function isLine( line: unknown ): line is number {
	return Number.isInteger( line ) && ( line as number ) >= 0;
}

/**
 * Keeps the slide preview window showing the active document: sends it each
 * time it changes, and when the preview window opens. Links the slides to the
 * editor too: the preview follows the selected block to its slide, and a
 * click on a slide selects the slide's first block.
 *
 * @param activeTab The active tab, if any.
 * @param editorRef The editor of the active tab.
 * @return Callback for the editor's `onSelectedLineChange`.
 */
export default function usePreviewSync(
	activeTab: Tab | undefined,
	editorRef: RefObject< EditorHandle | null >
): ( line: number | null ) => void {
	const markdown = activeTab?.content ?? '';
	const documentPath = activeTab?.filePath;
	const isMarp = isMarpDocument( markdown );
	const payload = useMemo< PreviewPayload >( () => {
		return isMarp
			? { markdown, documentPath }
			: { notice: __( 'Not a Marp document', 'mark-bricks' ) };
	}, [ isMarp, markdown, documentPath ] );

	const payloadRef = useRef( payload );
	payloadRef.current = payload;
	const isMarpRef = useRef( isMarp );
	isMarpRef.current = isMarp;
	const selectedLineRef = useRef< number | null >( null );

	useEffect( () => {
		const unlistenReady = listen( PREVIEW_READY_EVENT, () => {
			sendToPreview( PREVIEW_DOCUMENT_EVENT, payloadRef.current );
			sendToPreview( PREVIEW_SELECTED_LINE_EVENT, {
				line: selectedLineRef.current,
			} satisfies PreviewLinePayload );
		} );
		const unlistenClick = listen< PreviewLinePayload >(
			PREVIEW_LINE_CLICK_EVENT,
			( { payload: { line } } ) => {
				if ( isMarpRef.current && isLine( line ) ) {
					editorRef.current?.selectLine( line );
				}
			}
		);
		return () => {
			void unlistenReady.then( ( fn ) => fn() );
			void unlistenClick.then( ( fn ) => fn() );
		};
	}, [ editorRef ] );

	useEffect( () => {
		sendToPreview( PREVIEW_DOCUMENT_EVENT, payload );
	}, [ payload ] );

	return useCallback( ( line: number | null ) => {
		selectedLineRef.current = line;
		sendToPreview( PREVIEW_SELECTED_LINE_EVENT, {
			line,
		} satisfies PreviewLinePayload );
	}, [] );
}
