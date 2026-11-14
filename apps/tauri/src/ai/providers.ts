/**
 * Internal dependencies
 */
import { DEFAULT_MODEL as ANTHROPIC_DEFAULT_MODEL } from './anthropic';
import { DEFAULT_MODEL as OPENAI_DEFAULT_MODEL } from './openai';

/**
 * An AI provider the assistant can use. The native side names it the same
 * way.
 */
export type AiProvider = 'anthropic' | 'openai';

export const DEFAULT_PROVIDER: AiProvider = 'anthropic';

type ProviderInfo = {
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
};

export const PROVIDERS: Record< AiProvider, ProviderInfo > = {
	anthropic: {
		name: 'Anthropic',
		defaultModel: ANTHROPIC_DEFAULT_MODEL,
		keyPlaceholder: 'sk-ant-…',
	},
	openai: {
		name: 'OpenAI',
		defaultModel: OPENAI_DEFAULT_MODEL,
		keyPlaceholder: 'sk-…',
	},
};

/**
 * Checks a provider read from the preferences.
 *
 * @param value The saved value.
 * @return The provider, or the default provider when the value is not one.
 */
export function toProvider( value: unknown ): AiProvider {
	return typeof value === 'string' &&
		Object.prototype.hasOwnProperty.call( PROVIDERS, value )
		? ( value as AiProvider )
		: DEFAULT_PROVIDER;
}
