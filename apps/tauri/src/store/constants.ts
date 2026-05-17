/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { State, Tab } from './reducer';

const INITIAL_TAB: Tab = {
	id: 'tab-1',
	title: __( '(Untitled)', 'mark-bricks' ),
	isDirty: false,
	content: '',
};

export const DEFAULT_STATE: State = {
	tabs: [ INITIAL_TAB ],
	activeTabId: INITIAL_TAB.id,
	pendingCloseId: null,
};
