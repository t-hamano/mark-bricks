/**
 * External dependencies
 */
import type { AiEdit } from '@mark-bricks/editor';

/**
 * The tool the model calls to edit the document. Every provider declares
 * it the same way, in its own format.
 */
export const EDIT_TOOL_NAME = 'edit_document';

export const EDIT_TOOL_DESCRIPTION =
	'Edits the document. Use it when the user asks you to write or change content. "replace" replaces the selection with the Markdown, and "insert_after" inserts the Markdown after the selection. "replace_text" replaces the text in "find", which must appear exactly once in the document, with the Markdown, wherever the selection is.';

export const EDIT_TOOL_SCHEMA = {
	type: 'object',
	properties: {
		action: {
			type: 'string',
			enum: [ 'replace', 'insert_after', 'replace_text' ],
			description: 'How to apply the Markdown.',
		},
		find: {
			type: 'string',
			description:
				'For "replace_text", the exact text of the document to replace, without the selection markers. It must match only one place. Empty for the other actions.',
		},
		markdown: {
			type: 'string',
			description:
				'The new content in Markdown, without the selection markers.',
		},
	},
	// Every property is required, since strict tools need it. `find` is
	// empty when it does not apply.
	required: [ 'action', 'find', 'markdown' ],
	additionalProperties: false,
};

/**
 * The text sent back to the model after its edit changed the document.
 */
export const EDIT_RESULT = 'The edit was applied.';

/**
 * How many times the model may call the edit tool in one answer: once,
 * and again after each edit that failed, for example because its `find`
 * text was not in the document.
 */
export const MAX_EDIT_ATTEMPTS = 3;

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
	const { action, find, markdown } = input as Record< string, unknown >;
	if ( typeof markdown !== 'string' ) {
		return null;
	}
	if ( action === 'replace_text' ) {
		return typeof find === 'string' ? { action, find, markdown } : null;
	}
	if ( action !== 'replace' && action !== 'insert_after' ) {
		return null;
	}
	return { action, markdown };
}

/**
 * The edit tool's input for an edit, as the model would write it.
 *
 * @param edit The edit.
 * @return The tool's input.
 */
export function toToolInput( edit: AiEdit ) {
	return {
		action: edit.action,
		find: edit.action === 'replace_text' ? edit.find : '',
		markdown: edit.markdown,
	};
}
