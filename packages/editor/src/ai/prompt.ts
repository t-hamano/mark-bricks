/**
 * Internal dependencies
 */
import type { EditContext } from './edit-target';
import { isMarpContextDocument, MARP_GUIDE } from './marp-guide';

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
		'When the user asks you to write or change content, edit the document with the tool for editing the document, in Markdown. Use "replace" to rewrite the selection, and "insert_after" to add content after it. Do not include the <selection> markers in your Markdown.',
		context.selection
			? 'Edit the selection, unless the user clearly asks to change another part of the document. Then use "replace_text".'
			: 'When the user asks to change existing content, work out which part they mean from their message and the document, and change it with "replace_text", without asking them to select it.',
		'For "replace_text", set "find" to the exact text to change, copied from the document without the <selection> markers, and long enough to match only one place. The Markdown replaces only that text, so to change the front matter this way, replace only lines inside it. If the tool says the text was not found, or matches more than one place, correct "find" and try again.',
		'Front matter, such as Marp directives, must be the first lines of the document: a line of exactly "---", the YAML keys with no blank lines, and a closing line of exactly "---". To change it, start your Markdown with the whole front matter in that form.',
		'When the user only asks a question, answer it without editing.',
		'After editing, briefly say what you changed. Do not repeat the content you wrote.'
	);
	// The guide is fixed text placed before the document, so the prompt
	// cache covers it.
	if ( isMarpContextDocument( context.document ) ) {
		lines.push( '', MARP_GUIDE );
	}
	lines.push(
		'',
		'<document>',
		context.document.replace( /\n+$/, '' ),
		'</document>'
	);
	return lines.join( '\n' );
}
