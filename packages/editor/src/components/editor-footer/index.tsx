/**
 * WordPress dependencies
 */
import {
	// @ts-expect-error -- `BlockBreadcrumb` is not declared in the type definitions.
	BlockBreadcrumb,
} from '@wordpress/block-editor';
import { Stack } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import './style.scss';

export function EditorFooter() {
	return (
		<Stack render={ <footer /> } className="editor-footer" align="center">
			<BlockBreadcrumb />
		</Stack>
	);
}
