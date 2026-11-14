/**
 * External dependencies
 */
import type { AiEdit } from '@mark-bricks/editor';

/**
 * The tool the model calls to edit the selection. Every provider declares
 * it the same way, in its own format.
 */
export const EDIT_TOOL_NAME = 'edit_selection';

export const EDIT_TOOL_DESCRIPTION =
	'Edits the document at the selection. Use it when the user asks you to write or change content. "replace" replaces the selection with the Markdown, and "insert_after" inserts the Markdown after the selection.';

export const EDIT_TOOL_SCHEMA = {
	type: 'object',
	properties: {
		action: {
			type: 'string',
			enum: [ 'replace', 'insert_after' ],
			description: 'How to apply the Markdown to the selection.',
		},
		markdown: {
			type: 'string',
			description:
				'The new content in Markdown, without the selection markers.',
		},
	},
	required: [ 'action', 'markdown' ],
	additionalProperties: false,
};

/**
 * The text sent back to the model after it edits the selection.
 */
export const EDIT_RESULT = 'The edit was applied.';

/**
 * Checks the edit tool's input.
 *
 * @param input The tool's parsed input.
 * @return The edit, or `null` when the input is not valid.
 */
export function toEdit( input: unknown ): AiEdit | null {
	if ( ! input || typeof input !== 'object' ) {
		return null;
	}
	const { action, markdown } = input as Record< string, unknown >;
	if (
		( action !== 'replace' && action !== 'insert_after' ) ||
		typeof markdown !== 'string'
	) {
		return null;
	}
	return { action, markdown };
}
