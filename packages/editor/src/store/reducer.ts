/**
 * Internal dependencies
 */
import type { Action } from './actions';
import { DEFAULT_STATE } from './constants';

export interface State {
	isListViewOpened: boolean;
	isInserterOpened: boolean;
}

export function reducer( state: State = DEFAULT_STATE, action: Action ) {
	switch ( action.type ) {
		case 'SET_IS_LIST_VIEW_OPENED':
			return {
				...state,
				isListViewOpened: action.isOpened,
				isInserterOpened: action.isOpened
					? false
					: state.isInserterOpened,
			};
		case 'SET_IS_INSERTER_OPENED':
			return {
				...state,
				isInserterOpened: action.isOpened,
				isListViewOpened: action.isOpened
					? false
					: state.isListViewOpened,
			};
		default:
			return state;
	}
}
