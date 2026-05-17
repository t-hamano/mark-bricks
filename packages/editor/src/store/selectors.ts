/**
 * Internal dependencies
 */
import type { State } from './reducer';

export const selectors = {
	isListViewOpened( state: State ) {
		return state.isListViewOpened;
	},
	isInserterOpened( state: State ) {
		return state.isInserterOpened;
	},
};
