/**
 * Internal dependencies
 */
import type { State } from './reducer';

export const selectors = {
	getTabs( state: State ) {
		return state.tabs;
	},
	getActiveTabId( state: State ) {
		return state.activeTabId;
	},
	getPendingCloseId( state: State ) {
		return state.pendingCloseId;
	},
	// The document whose reload prompt is shown, or `null`.
	getReloadPromptId( state: State ) {
		return state.reloadPromptIds[ 0 ] ?? null;
	},
};
