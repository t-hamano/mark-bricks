/**
 * Internal dependencies
 */
import type { AiProviderAdapter } from '../provider';
import { readAnswer } from './answer';
import { createHttpError, PROVIDER_NAME } from './errors';
import {
	buildRequestBody,
	DEFAULT_MODEL,
	toMessageParams,
	type MessageParam,
} from './request';

/**
 * The Anthropic Messages API.
 */
export const anthropic: AiProviderAdapter = {
	name: PROVIDER_NAME,
	defaultModel: DEFAULT_MODEL,
	keyPlaceholder: 'sk-ant-…',
	buildRequest: ( { model, system, messages, continuation } ) =>
		buildRequestBody( {
			model,
			system,
			messages: [
				...toMessageParams( messages ),
				...( ( continuation ?? [] ) as MessageParam[] ),
			],
			allowEditTool: ! continuation,
		} ),
	readAnswer,
	createHttpError,
};

export { DEFAULT_MODEL };
