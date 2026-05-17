/**
 * WordPress dependencies
 */
import {
	BlockToolbar,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { Popover } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { Stack } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import './style.scss';

export function MobileBlockToolbar() {
	const hasBlockSelection = useSelect(
		( select ) => !! select( blockEditorStore ).getBlockSelectionStart(),
		[]
	);

	if ( ! hasBlockSelection ) {
		return null;
	}

	return (
		<Stack className="mobile-block-toolbar" align="center">
			<BlockToolbar
				// @ts-expect-error -- hideDragHandle is missing from the published BlockToolbar type defs.
				hideDragHandle
			/>
			<Popover.Slot name="block-toolbar" />
		</Stack>
	);
}
