/**
 * External dependencies
 */
import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

/**
 * Internal dependencies
 */
import type { Tab } from '../store';

const APP_NAME = 'MarkBricks';

export default function useWindowTitle( activeTab: Tab | undefined ) {
	useEffect( () => {
		if ( ! activeTab ) {
			getCurrentWindow().setTitle( APP_NAME );
			return;
		}
		const dirtyMark = activeTab.isDirty ? ' ●' : '';
		getCurrentWindow().setTitle(
			`${ activeTab.title }${ dirtyMark } — ${ APP_NAME }`
		);
	}, [ activeTab ] );
}
