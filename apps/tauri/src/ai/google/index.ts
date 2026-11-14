/**
 * Internal dependencies
 */
import type { AiProviderAdapter } from '../provider';
import { createHttpError, PROVIDER_NAME } from './errors';
import { filterChatModels } from './models';
import {
	buildRequestBody,
	DEFAULT_MODEL,
	toContents,
	type Content,
} from './request';
import { readAnswer } from './response-stream';

/**
 * The Gemini API of Google AI Studio.
 */
export const google: AiProviderAdapter = {
	name: PROVIDER_NAME,
	defaultModel: DEFAULT_MODEL,
	keyPlaceholder: 'AIza…',
	keyUrl: 'https://aistudio.google.com/api-keys',
	usageUrl: 'https://aistudio.google.com/usage',
	buildRequest: ( { model, system, messages, continuation } ) =>
		buildRequestBody( {
			model,
			system,
			contents: toContents(
				messages,
				( continuation ?? [] ) as Content[]
			),
			allowEditTool: ! continuation,
		} ),
	readAnswer,
	createHttpError,
	filterModels: filterChatModels,
};

export { DEFAULT_MODEL };
