/**
 * External dependencies
 */
import type { EditorStyles } from '@mark-bricks/editor/block-editor';

/**
 * Internal dependencies
 */
import type { FontFamily, Settings } from '../shared/settings';

// An empty stack leaves the editor's own default font in place.
const FONT_FAMILY_STACKS: Record< FontFamily, string > = {
	system: '',
	'sans-serif':
		"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', Arial, sans-serif",
	serif: "Georgia, Cambria, 'Times New Roman', Times, serif",
	monospace:
		"ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, 'Liberation Mono', 'Courier New', monospace",
	handwriting:
		"'Comic Sans MS', 'Comic Sans', 'Chalkboard SE', 'Marker Felt', cursive",
};

export function toEditorStyles( settings: Settings ): EditorStyles {
	return {
		contentWidth: settings.contentWidth,
		fontSize: settings.fontSize,
		fontFamily: FONT_FAMILY_STACKS[ settings.fontFamily ],
	};
}
