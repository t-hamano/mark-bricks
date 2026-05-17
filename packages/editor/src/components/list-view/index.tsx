/**
 * WordPress dependencies
 */
import {
	// @ts-expect-error -- __experimentalListView is not declared.
	__experimentalListView,
} from '@wordpress/block-editor';
import { __experimentalSpacer as Spacer } from '@wordpress/components';

export function ListView() {
	return (
		<Spacer className="list-view" padding={ 1 } marginBottom={ 0 }>
			<__experimentalListView />
		</Spacer>
	);
}
