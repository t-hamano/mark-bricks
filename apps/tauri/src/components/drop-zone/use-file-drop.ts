/**
 * External dependencies
 */
import { useEffect, useState } from 'react';
import { getCurrentWebview } from '@tauri-apps/api/webview';

/**
 * Internal dependencies
 */
import { openDroppedPaths } from '../../actions';

export default function useFileDrop() {
	const [ isDraggingOver, setIsDraggingOver ] = useState( false );

	useEffect( () => {
		let unlisten: ( () => void ) | undefined;
		let cancelled = false;

		getCurrentWebview()
			.onDragDropEvent( ( { payload } ) => {
				switch ( payload.type ) {
					case 'enter':
					case 'over':
						setIsDraggingOver( true );
						break;
					case 'drop':
						setIsDraggingOver( false );
						void openDroppedPaths( payload.paths );
						break;
					default:
						setIsDraggingOver( false );
				}
			} )
			.then( ( fn ) => {
				if ( cancelled ) {
					fn();
				} else {
					unlisten = fn;
				}
			} );

		return () => {
			cancelled = true;
			unlisten?.();
		};
	}, [] );

	return isDraggingOver;
}
