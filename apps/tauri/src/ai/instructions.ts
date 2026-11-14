/**
 * Adds the user's custom instructions to the start of the system prompt.
 *
 * They go first because they stay the same from one message to the next,
 * while the rest of the system prompt changes with the document, so the
 * start of the prompt can be cached.
 *
 * @param system       The system prompt from the editor.
 * @param instructions The custom instructions from the preferences.
 * @return The system prompt, with the instructions when there are any.
 */
export function withCustomInstructions(
	system: string,
	instructions: unknown
): string {
	const text = typeof instructions === 'string' ? instructions.trim() : '';
	if ( ! text ) {
		return system;
	}
	return [
		'The user gave these instructions for every conversation. Follow them, unless they conflict with the instructions after them.',
		'<custom_instructions>',
		text,
		'</custom_instructions>',
		'',
		system,
	].join( '\n' );
}
