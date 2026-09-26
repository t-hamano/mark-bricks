/**
 * External dependencies
 */
import type { EditorStyles } from '@mark-bricks/editor/block-editor';
import { FONT_FAMILY_STACKS } from '@mark-bricks/editor/font-families';

/**
 * Internal dependencies
 */
import type { Settings } from '../shared/settings';

export function toEditorStyles( settings: Settings ): EditorStyles {
	return {
		contentWidth: settings.contentWidth,
		fontSize: settings.fontSize,
		fontFamily: FONT_FAMILY_STACKS[ settings.fontFamily ],
	};
}
