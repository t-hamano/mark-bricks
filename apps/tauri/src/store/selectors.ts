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
};
