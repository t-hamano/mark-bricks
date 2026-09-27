/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { Action } from './actions';
import { DEFAULT_STATE } from './constants';

export type Tab = {
	id: string;
	title: string;
	isDirty: boolean;
	filePath?: string;
	documentId?: string;
	content: string;
};

export interface State {
	tabs: Tab[];
	nextTabSeq: number;
	activeTabId: string | null;
	pendingCloseId: string | null;
}

function basename( path: string ) {
	const m = path.match( /[^\\/]+$/ );
	return m ? m[ 0 ] : path;
}

export function reducer( state: State = DEFAULT_STATE, action: Action ) {
	switch ( action.type ) {
		case 'OPEN_TAB': {
			// Never reuse IDs while a native file dialog can still be pending.
			const seq = state.nextTabSeq;
			const newTab: Tab = {
				id: `tab-${ seq }`,
				title: __( '(Untitled)', 'mark-bricks' ),
				isDirty: false,
				content: '',
			};
			return {
				...state,
				tabs: [ ...state.tabs, newTab ],
				nextTabSeq: seq + 1,
				activeTabId: newTab.id,
			};
		}
		case 'OPEN_FILE_TAB': {
			const seq = state.nextTabSeq;
			const newTab: Tab = {
				id: `tab-${ seq }`,
				title: basename( action.filePath ),
				isDirty: false,
				filePath: action.filePath,
				documentId: action.documentId,
				content: action.content,
			};
			return {
				...state,
				tabs: [ ...state.tabs, newTab ],
				nextTabSeq: seq + 1,
				activeTabId: newTab.id,
			};
		}
		case 'SET_TAB_CONTENT':
			return {
				...state,
				tabs: state.tabs.map( ( t ) =>
					t.id === action.id ? { ...t, content: action.content } : t
				),
			};
		case 'CLOSE_TAB': {
			const idx = state.tabs.findIndex( ( t ) => t.id === action.id );
			if ( idx === -1 ) {
				return state;
			}
			const remaining = state.tabs.filter( ( t ) => t.id !== action.id );
			const pendingCloseId =
				state.pendingCloseId === action.id
					? null
					: state.pendingCloseId;
			let nextActive: string | null = state.activeTabId;
			if ( state.activeTabId === action.id ) {
				if ( remaining.length === 0 ) {
					nextActive = null;
				} else {
					const fallbackIdx = Math.max( idx - 1, 0 );
					nextActive = remaining[ fallbackIdx ].id;
				}
			}
			return {
				...state,
				tabs: remaining,
				activeTabId: nextActive,
				pendingCloseId,
			};
		}
		case 'SET_ACTIVE_TAB':
			if ( ! state.tabs.some( ( t ) => t.id === action.id ) ) {
				return state;
			}
			return { ...state, activeTabId: action.id };
		case 'SET_TAB_DIRTY':
			return {
				...state,
				tabs: state.tabs.map( ( t ) =>
					t.id === action.id ? { ...t, isDirty: action.isDirty } : t
				),
			};
		case 'SET_TAB_FILE':
			return {
				...state,
				tabs: state.tabs.map( ( t ) =>
					t.id === action.id
						? {
								...t,
								filePath: action.filePath,
								documentId: action.documentId,
								title: basename( action.filePath ),
							}
						: t
				),
			};
		case 'SET_PENDING_CLOSE_ID':
			return { ...state, pendingCloseId: action.id };
		default:
			return state;
	}
}
