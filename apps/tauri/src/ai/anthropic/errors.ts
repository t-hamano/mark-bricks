/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';

/**
 * A failed request. The message is written for the user.
 */
export class AnthropicError extends Error {
	/**
	 * The API's error type, such as `rate_limit_error`, or `null` when the
	 * failure did not come from the API.
	 */
	readonly errorType: string | null;

	constructor( message: string, errorType: string | null = null ) {
		super( message );
		this.name = 'AnthropicError';
		this.errorType = errorType;
	}
}

/**
 * Describes an error the API reported, for the user.
 *
 * @param errorType  The error's type, such as `authentication_error`.
 * @param apiMessage The API's own message.
 */
export function describeApiError(
	errorType: string,
	apiMessage: string
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
		case 'rate_limit_error':
			return __(
				'Too many requests. Wait a moment and try again.',
				'mark-bricks'
			);
		case 'overloaded_error':
		case 'api_error':
			return __(
				'The Anthropic API is not available right now. Try again later.',
				'mark-bricks'
			);
	}
	return apiMessage
		? sprintf(
				/* translators: %s: The error message from the Anthropic API. */
				__( 'The request failed: %s', 'mark-bricks' ),
				apiMessage
			)
		: __( 'The request failed.', 'mark-bricks' );
}

const STATUS_ERROR_TYPES: Record< number, string > = {
	401: 'authentication_error',
	403: 'permission_error',
	404: 'not_found_error',
	429: 'rate_limit_error',
	500: 'api_error',
	529: 'overloaded_error',
};

/**
 * Builds the error for a response that failed with an HTTP status. The
 * transport calls it with the response's body.
 *
 * @param status The HTTP status.
 * @param body   The response's body, which is JSON when the API sent it.
 */
export function createHttpError( status: number, body: string ) {
	let errorType = STATUS_ERROR_TYPES[ status ] ?? '';
	let apiMessage = '';
	try {
		const parsed = JSON.parse( body ) as {
			error?: { type?: string; message?: string };
		};
		errorType = parsed.error?.type ?? errorType;
		apiMessage = parsed.error?.message ?? '';
	} catch {
		// The body is not JSON, for example from a proxy in between.
	}
	return new AnthropicError(
		describeApiError( errorType, apiMessage || `HTTP ${ status }` ),
		errorType || null
	);
}
