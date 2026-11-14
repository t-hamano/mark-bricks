/**
 * Internal dependencies
 */
import type { AiModel } from '../provider';

/**
 * Words in the ids of models that do not answer in text, such as audio and
 * image models, or that are made for other tasks.
 */
const NON_CHAT_WORDS =
	/(?:^|-)(?:audio|tts|image|live|embedding|robotics|computer-use|deep-research)(?:-|$)/;

/**
 * Keeps the Gemini models the assistant can chat with, newest first. The
 * Models API lists every model that generates content, including the Gemma
 * models and the image and audio models.
 *
 * The models are named by their version, such as `gemini-3.6-flash`, so
 * the versions order them. Aliases, such as `gemini-flash-latest`, have no
 * version and are left out.
 *
 * @param models The models of the API key.
 */
export function filterChatModels( models: AiModel[] ): AiModel[] {
	return models
		.filter(
			( { id } ) =>
				/^gemini-\d/.test( id ) &&
				// Older models cannot think, which the requests turn on.
				! /^gemini-(?:1\.|2\.0)/.test( id ) &&
				! NON_CHAT_WORDS.test( id )
		)
		.sort( ( a, b ) =>
			b.id.localeCompare( a.id, 'en', { numeric: true } )
		);
}
