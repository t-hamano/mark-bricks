/**
 * WordPress dependencies
 */
import {
	// @ts-expect-error -- __experimentalListView is not declared.
	__experimentalListView,
} from '@wordpress/block-editor';

/**
 * Internal dependencies
 */
import './style.scss';

export function ListView() {
	return (
		<div className="list-view">
			<__experimentalListView />
		</div>
	);
}
