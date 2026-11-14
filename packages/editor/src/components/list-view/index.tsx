/**
 * WordPress dependencies
 */
import { __experimentalListView } from '@wordpress/block-editor';

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
