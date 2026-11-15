/**
 * External dependencies
 */
import { useEffect, useState } from 'react';

/**
 * Internal dependencies
 */
import { hasAnyApiKey, subscribeApiKeys } from '../ai/settings';

/**
 * Whether an API key is saved for any provider. It is `false` until the
 * first check ends, and is checked again each time a key is saved or
 * deleted.
 */
export default function useHasApiKey(): boolean {
	const [ hasKey, setHasKey ] = useState( false );

	useEffect( () => {
		let isCurrent = true;
		// Only the latest check sets the state, so that an earlier one that
		// ends later does not undo a key that was saved or deleted since.
		let latest = 0;
		const check = () => {
			const id = ++latest;
			hasAnyApiKey().then( ( result ) => {
				if ( isCurrent && id === latest ) {
					setHasKey( result );
				}
			} );
		};
		check();
		const unsubscribe = subscribeApiKeys( check );
		return () => {
			isCurrent = false;
			unsubscribe();
		};
	}, [] );

	return hasKey;
}
