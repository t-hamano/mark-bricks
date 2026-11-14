/**
 * Internal dependencies
 */
import type { AiModel } from '../settings';

/**
 * Words in the ids of models that do not answer in text through the
 * Responses API, such as audio and image models.
 */
const NON_CHAT_WORDS =
	/(?:^|-)(?:audio|realtime|tts|transcribe|image|embedding|moderation|instruct|search|computer|deep-research)(?:-|$)/;

/**
 * Keeps the models the assistant can chat with. The Models API lists every
 * model the API key can use, including embedding and audio models.
 *
 * @param models The models of the API key.
 */
export function filterChatModels( models: AiModel[] ): AiModel[] {
	return models.filter(
		( { id } ) =>
			/^(?:gpt-|chatgpt-|o\d)/.test( id ) &&
			! id.startsWith( 'gpt-3.5' ) &&
			! NON_CHAT_WORDS.test( id )
	);
}
