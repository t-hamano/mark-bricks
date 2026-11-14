/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { AiError } from '../error';

/**
 * A failed request to the OpenAI API. The message is written for the user.
 * `errorType` is the kind of failure, named as for the Anthropic API, such
 * as `authentication_error`, so that the settings can treat both the same.
 */
export class OpenAiError extends AiError {
	constructor( message: string, errorType: string | null = null ) {
		super( message, errorType );
		this.name = 'OpenAiError';
	}
}

const STATUS_ERROR_TYPES: Record< number, string > = {
	401: 'authentication_error',
	403: 'permission_error',
	404: 'not_found_error',
	429: 'rate_limit_error',
};

const CODE_ERROR_TYPES: Record< string, string > = {
	invalid_api_key: 'authentication_error',
	model_not_found: 'not_found_error',
	insufficient_quota: 'insufficient_quota',
	rate_limit_exceeded: 'rate_limit_error',
	server_error: 'api_error',
};

/**
 * Names the kind of failure from what the API reported.
 *
 * @param status The HTTP status, or `0` for an error in the stream.
 * @param code   The API's error code, such as `invalid_api_key`.
 */
function toErrorType( status: number, code: string ): string {
	if ( CODE_ERROR_TYPES[ code ] ) {
		return CODE_ERROR_TYPES[ code ];
	}
	if ( STATUS_ERROR_TYPES[ status ] ) {
		return STATUS_ERROR_TYPES[ status ];
	}
	return status >= 500 ? 'api_error' : '';
}

/**
 * Describes a failure, for the user.
 *
 * @param errorType  The kind of failure, from `toErrorType`.
 * @param apiMessage The API's own message.
 */
function describeError( errorType: string, apiMessage: string ): string {
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
			return __(
				'The OpenAI account has no credit left. Check its billing settings.',
				'mark-bricks'
			);
		case 'rate_limit_error':
			return __(
				'Too many requests. Wait a moment and try again.',
				'mark-bricks'
			);
		case 'api_error':
			return sprintf(
				/* translators: %s: The name of the AI provider, such as OpenAI. */
				__(
					'The %s API is not available right now. Try again later.',
					'mark-bricks'
				),
				'OpenAI'
			);
	}
	return apiMessage
		? sprintf(
				/* translators: %s: The error message from the OpenAI API. */
				__( 'The request failed: %s', 'mark-bricks' ),
				apiMessage
			)
		: __( 'The request failed.', 'mark-bricks' );
}

type ApiError = { code?: string | null; message?: string | null };

/**
 * Builds the error for a failure the API reported in the stream.
 *
 * @param error The API's error.
 */
export function createStreamError( error: ApiError | undefined ) {
	const errorType = toErrorType( 0, error?.code ?? '' );
	return new OpenAiError(
		describeError( errorType, error?.message ?? '' ),
		errorType || null
	);
}

/**
 * Builds the error for a response that failed with an HTTP status. The
 * transport calls it with the response's body.
 *
 * @param status The HTTP status.
 * @param body   The response's body, which is JSON when the API sent it.
 */
export function createHttpError( status: number, body: string ) {
	let code = '';
	let apiMessage = '';
	try {
		const parsed = JSON.parse( body ) as { error?: ApiError };
		code = parsed.error?.code ?? '';
		apiMessage = parsed.error?.message ?? '';
	} catch {
		// The body is not JSON, for example from a proxy in between.
	}
	const errorType = toErrorType( status, code );
	return new OpenAiError(
		describeError( errorType, apiMessage || `HTTP ${ status }` ),
		errorType || null
	);
}
