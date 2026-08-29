/**
 * External dependencies
 */
import { useEffect, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

/**
 * WordPress dependencies
 */
import { select, useDispatch } from '@wordpress/data';

/**
 * Internal dependencies
 */
import { flushPendingEdits } from '../actions';
import tabsStore, { type Tab } from '../store';

type Props = {
	tabs: Tab[];
	pendingCloseId: string | null;
};

export default function useAppCloseGuard( { tabs, pendingCloseId }: Props ) {
	const { setPendingCloseId } = useDispatch( tabsStore );

	const isClosingAppRef = useRef( false );
	const prevPendingRef = useRef< string | null >( pendingCloseId );

	useEffect( () => {
		let unlisten: ( () => void ) | undefined;
		getCurrentWindow()
			.onCloseRequested( ( event ) => {
				flushPendingEdits();
				const dirty = select( tabsStore )
					.getTabs()
					.find( ( t ) => t.isDirty );
				if ( ! dirty ) {
					return;
				}
				event.preventDefault();
				isClosingAppRef.current = true;
				setPendingCloseId( dirty.id );
			} )
			.then( ( fn ) => {
				unlisten = fn;
			} );
		return () => unlisten?.();
	}, [ setPendingCloseId ] );

	useEffect( () => {
		const prev = prevPendingRef.current;
		prevPendingRef.current = pendingCloseId;

		if ( ! isClosingAppRef.current ) {
			return;
		}
		if ( pendingCloseId !== null || prev === null ) {
			return;
		}

		// pendingCloseId transitioned <id> -> null: dialog was closed.
		// If the tab still exists, the user cancelled -> abort the app close.
		if ( tabs.some( ( t ) => t.id === prev ) ) {
			isClosingAppRef.current = false;
			return;
		}

		const nextDirty = tabs.find( ( t ) => t.isDirty );
		if ( nextDirty ) {
			setPendingCloseId( nextDirty.id );
			return;
		}
		isClosingAppRef.current = false;
		getCurrentWindow().destroy();
	}, [ pendingCloseId, tabs, setPendingCloseId ] );
}
