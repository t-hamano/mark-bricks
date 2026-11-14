/**
 * Internal dependencies
 */
import { anthropic } from './anthropic';
import { openai } from './openai';
import type { AiProviderAdapter } from './provider';

/**
 * The providers the assistant can use. To add one, implement
 * `AiProviderAdapter` in its own folder and list it here, and in the
 * native side's `Provider`, which names it the same way.
 */
export const PROVIDERS = {
	anthropic,
	openai,
} satisfies Record< string, AiProviderAdapter >;

export type AiProvider = keyof typeof PROVIDERS;

export const DEFAULT_PROVIDER: AiProvider = 'anthropic';

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
