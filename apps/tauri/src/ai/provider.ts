/**
 * External dependencies
 */
import type { AiActivity, AiMessage, AiUsage } from '@mark-bricks/editor';

/**
 * Internal dependencies
 */
import type { AiError } from './error';

/**
 * A model the API key can use.
 */
export type AiModel = {
	id: string;
	displayName: string;
};

/**
 * A finished answer, as the provider read it.
 */
export type ProviderAnswer = {
	/**
	 * The model's call of the edit tool, if it made one. `input` is
	 * `undefined` when it could not be parsed.
	 */
	editCall?: { input: unknown };
	/**
	 * What follows the conversation to continue the answer after the edit:
	 * the answer, and the edit tool's result, in the provider's own format.
	 */
	continuation: unknown[];
	/**
	 * The tokens the request used, when the provider reported them.
	 */
	usage?: AiUsage;
};

/**
 * What the assistant needs from an AI provider. Each provider implements
 * it in its own folder, and `providers.ts` lists them. The conversation
 * itself, with the edit in its middle, is the same for every provider, in
 * `chat.ts`.
 */
export type AiProviderAdapter = {
	/**
	 * The provider's name, which is not translated.
	 */
	name: string;
	/**
	 * The model used when none is chosen.
	 */
	defaultModel: string;
	/**
	 * How the provider's API keys start, for the input's placeholder.
	 */
	keyPlaceholder: string;
	/**
	 * The page of the provider's console where API keys are created.
	 */
	keyUrl: string;
	/**
	 * The page of the provider's console that shows the tokens used and
	 * what they cost, including use outside the app.
	 */
	usageUrl: string;
	/**
	 * Builds the body of a streamed request.
	 *
	 * @param options              The request.
	 * @param options.model        The model to use.
	 * @param options.system       The system prompt.
	 * @param options.messages     The conversation, ending with the user's
	 *                             new message.
	 * @param options.continuation The `continuation` of the answer that
	 *                             edited the selection, when the request
	 *                             continues it. The model may not edit again.
	 */
	buildRequest: ( options: {
		model: string;
		system: string;
		messages: AiMessage[];
		continuation?: unknown[];
	} ) => object;
	/**
	 * Reads a streamed answer from the payloads of its server-sent events.
	 * `finish` throws when the answer did not end normally.
	 *
	 * @param onText     Called with each piece of the answer's text.
	 * @param onActivity Called when the model starts to think, or to write
	 *                   its edit.
	 */
	readAnswer: (
		onText: ( text: string ) => void,
		onActivity: ( activity: AiActivity ) => void
	) => {
		handle: ( data: unknown ) => void;
		finish: () => ProviderAnswer;
	};
	/**
	 * Builds the error for a response that failed with an HTTP status.
	 *
	 * @param status The HTTP status.
	 * @param body   The response's body.
	 */
	createHttpError: ( status: number, body: string ) => AiError;
	/**
	 * Keeps the models the assistant can use, when the provider lists
	 * others too. Omitted when every listed model can be used.
	 *
	 * @param models The models of the API key.
	 */
	filterModels?: ( models: AiModel[] ) => AiModel[];
};
