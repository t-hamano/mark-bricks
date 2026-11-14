/**
 * Internal dependencies
 */
import type { EditContext } from './edit-target';

/**
 * Builds the instructions sent to the model with each message.
 *
 * @param context The selection and the document, or `null` when the editor
 *                cannot provide them.
 * @return The system prompt.
 */
export function buildSystemPrompt( context: EditContext | null ): string {
	const lines = [
		'You are the AI assistant of MarkBricks, a Markdown editor. Help the user write and edit their document.',
		'Answer in the language the user writes in.',
	];

	if ( ! context ) {
		lines.push(
			'The document is not available, so you cannot edit it. Answer in the conversation only.'
		);
		return lines.join( '\n' );
	}

	lines.push(
		context.selection
			? 'The user has selected part of the document. It is wrapped in <selection> and </selection> below.'
			: 'The user has not selected anything. The empty <selection></selection> below marks where new content goes.',
		'When the user asks you to write or change content, edit the document with the tool for editing the selection, in Markdown. Use "replace" to rewrite the selection, and "insert_after" to add content after it. Do not include the <selection> markers in your Markdown.',
		'Front matter, such as Marp directives, must be the first lines of the document: a line of exactly "---", the YAML keys with no blank lines, and a closing line of exactly "---". To change it, start your Markdown with the whole front matter in that form.',
		'When the user only asks a question, answer it without editing.',
		'After editing, briefly say what you changed. Do not repeat the content you wrote.',
		'',
		'<document>',
		context.document.replace( /\n+$/, '' ),
		'</document>'
	);
	return lines.join( '\n' );
}
