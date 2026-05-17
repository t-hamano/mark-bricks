/**
 * WordPress dependencies
 */
import { createReduxStore, register } from '@wordpress/data';

/**
 * Internal dependencies
 */
import { actions } from './actions';
import { reducer } from './reducer';
import { selectors } from './selectors';

export const STORE_NAME = 'mark-bricks/tabs';

export type { Tab } from './reducer';

const store = createReduxStore( STORE_NAME, {
	reducer,
	actions,
	selectors,
} );

register( store );

export default store;
