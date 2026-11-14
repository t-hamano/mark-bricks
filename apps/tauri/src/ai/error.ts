/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';

/**
 * A failed request to an AI provider. The message is written for the user.
 */
export class AiError extends Error {
	/**
	 * The kind of failure, such as `authentication_error`, or `null` when
	 * it is not known. Each provider names its failures as the Anthropic
	 * API does, so that they are handled the same way.
	 */
	readonly errorType: string | null;

	constructor( message: string, errorType: string | null = null ) {
		super( message );
		this.name = 'AiError';
		this.errorType = errorType;
	}
}

/**
 * Builds the error for a failure the provider's API reported.
 *
 * @param errorType    The kind of failure, such as `rate_limit_error`, or an
 *                     empty string when it is not known.
 * @param apiMessage   The API's own message.
 * @param providerName The provider's name, such as Anthropic.
 */
export function createApiError(
	errorType: string,
	apiMessage: string,
	providerName: string
): AiError {
	return new AiError(
		describeApiError( errorType, apiMessage, providerName ),
		errorType || null
	);
}

function describeApiError(
	errorType: string,
	apiMessage: string,
	providerName: string
): string {
	switch ( errorType ) {
		case 'authentication_error':
			return __(
				'The API key is not valid. Check it in the settings.',
				'mark-bricks'
			);
		case 'permission_error':
			return __( 'The API key cannot use this model.', 'mark-bricks' );
		case 'not_found_error':
			return __( 'The model was not found.', 'mark-bricks' );
		case 'insufficient_quota':
			return sprintf(
				/* translators: %s: The name of the AI provider, such as OpenAI. */
				__(
					'The %s account has no credit left. Check its billing settings.',
					'mark-bricks'
				),
				providerName
			);
		case 'rate_limit_error':
			return __(
				'Too many requests. Wait a moment and try again.',
				'mark-bricks'
			);
		case 'overloaded_error':
		case 'api_error':
			return sprintf(
				/* translators: %s: The name of the AI provider, such as Anthropic. */
				__(
					'The %s API is not available right now. Try again later.',
					'mark-bricks'
				),
				providerName
			);
	}
	return apiMessage
		? sprintf(
				/* translators: %s: The error message from the AI provider's API. */
				__( 'The request failed: %s', 'mark-bricks' ),
				apiMessage
			)
		: __( 'The request failed.', 'mark-bricks' );
}

/**
 * The response ended before the API finished the answer, for example
 * because the connection dropped.
 */
export function connectionClosedError() {
	return new AiError(
		__(
			'The connection closed before the answer was complete.',
			'mark-bricks'
		)
	);
}

export function refusalError() {
	return new AiError(
		__( 'The model declined to answer this request.', 'mark-bricks' ),
		'refusal'
	);
}

export function lengthLimitError() {
	return new AiError(
		__(
			'The answer was cut off because it reached the length limit.',
			'mark-bricks'
		),
		'max_tokens'
	);
}
