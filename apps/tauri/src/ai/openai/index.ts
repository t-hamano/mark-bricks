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
	buildRequest: ( { model, system, messages, continuation } ) =>
		buildRequestBody( {
			model,
			system,
			input: [
				...toInputItems( messages ),
				...( ( continuation ?? [] ) as InputItem[] ),
			],
			allowEditTool: ! continuation,
		} ),
	readAnswer,
	createHttpError,
	filterModels: filterChatModels,
};

export { DEFAULT_MODEL };
