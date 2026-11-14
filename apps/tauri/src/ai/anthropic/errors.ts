/**
 * Internal dependencies
 */
import { createApiError } from '../error';

export const PROVIDER_NAME = 'Anthropic';

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
	return createApiError(
		errorType,
		apiMessage || `HTTP ${ status }`,
		PROVIDER_NAME
	);
}
