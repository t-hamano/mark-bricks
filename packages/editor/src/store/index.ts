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

export const STORE_NAME = 'mark-bricks/editor';

export const store = createReduxStore( STORE_NAME, {
	reducer,
	actions,
	selectors,
} );

register( store );
