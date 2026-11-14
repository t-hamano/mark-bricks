/**
 * Internal dependencies
 */
import { createApiError } from '../error';

export const PROVIDER_NAME = 'Google Gemini';

const STATUS_ERROR_TYPES: Record< string, string > = {
	UNAUTHENTICATED: 'authentication_error',
	PERMISSION_DENIED: 'permission_error',
	NOT_FOUND: 'not_found_error',
	RESOURCE_EXHAUSTED: 'rate_limit_error',
	INTERNAL: 'api_error',
	UNAVAILABLE: 'overloaded_error',
	DEADLINE_EXCEEDED: 'api_error',
};

const HTTP_ERROR_TYPES: Record< number, string > = {
	401: 'authentication_error',
	403: 'permission_error',
	404: 'not_found_error',
	429: 'rate_limit_error',
	503: 'overloaded_error',
};

export type ApiError = {
	code?: number | null;
	message?: string | null;
	status?: string | null;
	details?: { reason?: string }[] | null;
};

/**
 * Names the kind of failure as the Anthropic API does, from what the
 * Gemini API reported.
 *
 * @param httpStatus The HTTP status, or `0` for an error in the stream.
 * @param error      The API's error.
 */
function toErrorType( httpStatus: number, error: ApiError | undefined ) {
	// The API answers an API key that is not valid with a 400, and says so
	// only in the error's details.
	if (
		error?.details?.some(
			( detail ) => detail.reason === 'API_KEY_INVALID'
		)
	) {
		return 'authentication_error';
	}
	const status = error?.status ?? '';
	if ( STATUS_ERROR_TYPES[ status ] ) {
		return STATUS_ERROR_TYPES[ status ];
	}
	const code = httpStatus || ( error?.code ?? 0 );
	if ( HTTP_ERROR_TYPES[ code ] ) {
		return HTTP_ERROR_TYPES[ code ];
	}
	return code >= 500 ? 'api_error' : '';
}

/**
 * Builds the error for a failure the API reported in the stream.
 *
 * @param error The API's error.
 */
export function createStreamError( error: ApiError | undefined ) {
	return createApiError(
		toErrorType( 0, error ),
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
	let error: ApiError | undefined;
	try {
		// The streaming endpoint wraps the error in a list.
		const parsed = JSON.parse( body ) as
			{ error?: ApiError } | { error?: ApiError }[];
		error = ( Array.isArray( parsed ) ? parsed[ 0 ] : parsed )?.error;
	} catch {
		// The body is not JSON, for example from a proxy in between.
	}
	return createApiError(
		toErrorType( status, error ),
		error?.message || `HTTP ${ status }`,
		PROVIDER_NAME
	);
}
