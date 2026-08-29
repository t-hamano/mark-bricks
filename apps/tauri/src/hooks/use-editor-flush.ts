/**
 * External dependencies
 */
import { useEffect, type RefObject } from 'react';
import type { EditorHandle } from '@mark-bricks/editor';

/**
 * Internal dependencies
 */
import { setEditorFlush } from '../actions';

/**
 * Lets the file actions drain the editor's debounced change before they read
 * tab content or dirty state. The ref is read lazily so the registration stays
 * correct across the remount that a tab switch triggers.
 *
 * @param ref Ref to the mounted editor.
 */
export default function useEditorFlush(
	ref: RefObject< EditorHandle | null >
) {
	useEffect( () => {
		setEditorFlush( () => ref.current?.flush() );
		return () => setEditorFlush( null );
	}, [ ref ] );
}
