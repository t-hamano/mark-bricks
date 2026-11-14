/**
 * External dependencies
 */
import type { EditorStyles } from '@mark-bricks/editor/block-editor';

/**
 * Internal dependencies
 */
import type { Settings } from '../shared/settings';

export function toEditorStyles( settings: Settings ): EditorStyles {
	return {
		contentWidth: settings.contentWidth,
		fontSize: settings.fontSize,
		fontFamily: settings.fontFamily,
	};
}
