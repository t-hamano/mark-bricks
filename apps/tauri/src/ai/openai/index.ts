/**
 * Internal dependencies
 */
import type { AiProviderAdapter } from '../provider';
import { createHttpError, PROVIDER_NAME } from './errors';
import { filterChatModels } from './models';
import {
	buildRequestBody,
	DEFAULT_MODEL,
	toInputItems,
	type InputItem,
} from './request';
import { readAnswer } from './response-stream';

/**
 * The OpenAI Responses API.
 */
export const openai: AiProviderAdapter = {
	name: PROVIDER_NAME,
	defaultModel: DEFAULT_MODEL,
	keyPlaceholder: 'sk-…',
	keyUrl: 'https://platform.openai.com/api-keys',
	usageUrl: 'https://platform.openai.com/usage',
	buildRequest: ( {
		model,
		system,
		messages,
		continuation,
		allowEditTool = true,
	} ) =>
		buildRequestBody( {
			model,
			system,
			input: [
				...toInputItems( messages ),
				...( ( continuation ?? [] ) as InputItem[] ),
			],
			allowEditTool,
		} ),
	readAnswer,
	createHttpError,
	filterModels: filterChatModels,
};

export { DEFAULT_MODEL };
