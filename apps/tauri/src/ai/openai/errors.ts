/**
 * Internal dependencies
 */
import { createApiError } from '../error';

export const PROVIDER_NAME = 'OpenAI';

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
 * Names the kind of failure as the Anthropic API does, from what the
 * OpenAI API reported.
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

type ApiError = { code?: string | null; message?: string | null };

/**
 * Builds the error for a failure the API reported in the stream.
 *
 * @param error The API's error.
 */
export function createStreamError( error: ApiError | undefined ) {
	return createApiError(
		toErrorType( 0, error?.code ?? '' ),
		error?.message ?? '',
		PROVIDER_NAME
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
	return createApiError(
		toErrorType( status, code ),
		apiMessage || `HTTP ${ status }`,
		PROVIDER_NAME
	);
}
