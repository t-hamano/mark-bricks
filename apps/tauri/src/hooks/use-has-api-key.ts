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
		const check = () => {
			hasAnyApiKey().then( ( result ) => {
				if ( isCurrent ) {
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
